import {
  cancelProcessingEngineJob,
  convertOfficeFileStreaming,
  createProcessingJobId,
  exportWorkspaceToDestinationStreaming,
  type ExportDestination,
  renderExportDecorationOverlayFromManifest,
  renderExportDecorationManifestPage,
  renderExportDecorationOverlayPage,
  inspectPdfFileStreaming,
  ProcessingEngineCancelledError,
  renderPdfThumbnailsStreaming,
  type DecorationLayoutManifest,
  type DecorationOverlayRenderResult,
  type ExportWorkspaceResult,
  type ProcessingEngineEvent,
} from "./backend";
import { useWorkbenchStore } from "./store";
import type { PageItem, PdfMetadata, WorkbenchFile, WorkbenchSnapshot } from "./types";

const inFlightFiles = new Map<string, Promise<void>>();
const inFlightThumbnailFiles = new Map<string, Promise<void>>();
const inFlightPreviewPageImages = new Map<string, Promise<PreviewPageImageResult>>();
const activePreparationJobIds = new Set<string>();
let activeExportJobId: string | undefined;
let activeExportCancellationRequested = false;

export type PreviewPageImageResult = {
  pageId: string;
  thumbnailPath?: string;
  previewPath?: string;
  previewZoom?: number;
};

export type PreviewPageImageOptions = {
  previewZoom?: number;
};

function isVirtualSource(path?: string): boolean {
  return Boolean(
    path?.startsWith("sample://") ||
      path?.startsWith("browser://") ||
      path?.startsWith("session://"),
  );
}

function joinWorkerPath(base: string, ...parts: string[]): string {
  const separator = base.includes("\\") ? "\\" : "/";
  return [base.replace(/[\\/]+$/, ""), ...parts.map((part) => part.replace(/^[\\/]+|[\\/]+$/g, ""))].join(
    separator,
  );
}

function normalizeEngineMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function throwIfCurrentExportCancelled(): void {
  if (activeExportCancellationRequested) {
    throw new ProcessingEngineCancelledError();
  }
}

async function trackPreparationJob<T>(jobId: string, runner: () => Promise<T>): Promise<T> {
  activePreparationJobIds.add(jobId);
  try {
    return await runner();
  } finally {
    activePreparationJobIds.delete(jobId);
  }
}

function scaledProgress(value: number, min: number, max: number): number {
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(min, Math.min(max, Math.round(min + normalized * (max - min))));
}

function handleFilePreparationEvent(
  fileId: string,
  event: ProcessingEngineEvent,
  minProgress: number,
  maxProgress: number,
): void {
  const store = useWorkbenchStore.getState();
  if (event.type === "progress") {
    store.setFileCacheProgress(
      fileId,
      "converting",
      scaledProgress(event.progress, minProgress, maxProgress),
      event.message,
    );
    return;
  }
  if (event.type === "log" && event.message) {
    store.addLog(event.level ?? "info", event.message);
  }
}

function resetFileAfterCancellation(file: WorkbenchFile): void {
  useWorkbenchStore
    .getState()
    .setFileCacheProgress(file.id, "queued", 0, `${file.name} の準備をキャンセルしました。`);
}

function metadataFromInspection(result: {
  encrypted: boolean;
  metadata?: Record<string, string>;
}): PdfMetadata {
  const metadata = result.metadata ?? {};
  return {
    encrypted: Boolean(result.encrypted),
    title: metadata.Title || metadata.title || undefined,
    author: metadata.Author || metadata.author || undefined,
    pageSizeLabel: metadata.PageSize || metadata.pageSize || undefined,
  };
}

function thumbnailMap(
  thumbnails: Array<{ pageNumber: number; thumbnailPath: string }>,
): Record<number, string> {
  return Object.fromEntries(
    thumbnails.map((thumbnail) => [thumbnail.pageNumber, thumbnail.thumbnailPath]),
  );
}

function previewMap(
  thumbnails: Array<{ pageNumber: number; previewPath?: string; thumbnailPath: string }>,
): Record<number, string> {
  return Object.fromEntries(
    thumbnails.map((thumbnail) => [
      thumbnail.pageNumber,
      thumbnail.previewPath ?? thumbnail.thumbnailPath,
    ]),
  );
}

function findPageById(pageId: string): { fileId: string; page: PageItem } | undefined {
  const state = useWorkbenchStore.getState();
  for (const [fileId, pages] of Object.entries(state.pagesByFile)) {
    const page = pages.find((item) => item.id === pageId);
    if (page) {
      return { fileId, page };
    }
  }
  return undefined;
}

function shouldProcessWithEngine(file: WorkbenchFile): boolean {
  if (file.excluded || !file.sourcePath || isVirtualSource(file.sourcePath)) {
    return false;
  }
  if (file.cacheState === "error") {
    return false;
  }
  if (file.kind === "pdf") {
    return file.engineState !== "inspected";
  }
  return file.cacheState === "queued" || file.cacheState === "stale";
}

async function processFileInternal(file: WorkbenchFile, sessionDir: string): Promise<void> {
  const store = useWorkbenchStore.getState();
  const sourcePath = file.sourcePath;
  if (!sourcePath) {
    store.failFileProcessing(file.id, "入力ファイルのパスがありません。");
    return;
  }

  try {
    throwIfCurrentExportCancelled();
    const password = useWorkbenchStore.getState().security.inputPassword;
    store.setFileCacheProgress(
      file.id,
      "converting",
      file.kind === "pdf" ? 24 : 6,
      file.kind === "pdf"
        ? `${file.name} のPDF解析を開始しました。`
        : `${file.name} のOffice PDF化を開始しました。`,
    );

    let pdfPath = sourcePath;
    if (file.kind !== "pdf") {
      const convertJobId = createProcessingJobId("convert");
      const converted = await trackPreparationJob(convertJobId, () =>
        convertOfficeFileStreaming(
          sourcePath,
          sessionDir,
          `${file.id}.pdf`,
          convertJobId,
          (event) => handleFilePreparationEvent(file.id, event, 8, 56),
        ),
      );
      throwIfCurrentExportCancelled();
      pdfPath = converted.outputPath ?? converted.cachePath ?? "";
      if (!pdfPath) {
        throw new Error("Office変換後のPDFパスを取得できませんでした。");
      }
      useWorkbenchStore
        .getState()
        .setFileCacheProgress(file.id, "converting", 58, `${file.name} のPDF化が完了しました。ページ解析中です。`);
    }

    throwIfCurrentExportCancelled();
    const inspectJobId = createProcessingJobId("inspect");
    const inspection = await trackPreparationJob(inspectJobId, () =>
      inspectPdfFileStreaming(pdfPath, password, inspectJobId, (event) =>
        handleFilePreparationEvent(file.id, event, 58, 76),
      ),
    );
    throwIfCurrentExportCancelled();
    useWorkbenchStore
      .getState()
      .setFileCacheProgress(file.id, "converting", 88, `${file.name} のページ構成を登録しています。`);

    useWorkbenchStore.getState().completeFileInspection(file.id, {
      cachePath: pdfPath,
      pageCount: inspection.pageCount,
      metadata: metadataFromInspection(inspection),
      engineState: file.kind === "pdf" ? "inspected" : "cached",
      message: `${file.name} を実PDFとして準備しました。${inspection.pageCount}ページ。サムネイルは展開時に生成します。`,
    });
  } catch (error) {
    if (error instanceof ProcessingEngineCancelledError) {
      resetFileAfterCancellation(file);
      return;
    }
    useWorkbenchStore.getState().failFileProcessing(file.id, normalizeEngineMessage(error));
  }
}

export function processWorkbenchFile(file: WorkbenchFile, sessionDir: string): Promise<void> {
  const existing = inFlightFiles.get(file.id);
  if (existing) {
    return existing;
  }

  const promise = processFileInternal(file, sessionDir).finally(() => {
    inFlightFiles.delete(file.id);
  });
  inFlightFiles.set(file.id, promise);
  return promise;
}

export function renderExpandedFileThumbnails(fileId: string, sessionDir: string): Promise<void> {
  const existing = inFlightThumbnailFiles.get(fileId);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const state = useWorkbenchStore.getState();
    const file = state.files.find((item) => item.id === fileId);
    const pages = state.pagesByFile[fileId] ?? [];
    if (!file || file.cacheState !== "ready" || pages.length === 0) {
      return;
    }
    if (!pages.some((page) => !page.thumbnailPath)) {
      return;
    }

    const pdfPath = file.cachePath || file.sourcePath;
    if (!pdfPath || isVirtualSource(pdfPath)) {
      return;
    }

    const password = state.security.inputPassword;
    const thumbnailDir = joinWorkerPath(sessionDir, "thumbnails", file.id);
    const thumbnailJobId = createProcessingJobId("thumbnail");
    state.addLog("info", `${file.name} のページサムネイルを生成しています。`);

    try {
      const thumbnails = await trackPreparationJob(thumbnailJobId, () =>
        renderPdfThumbnailsStreaming(
          pdfPath,
          thumbnailDir,
          file.pageCount || pages.length,
          password,
          thumbnailJobId,
          (event) => {
            if (event.type === "log" && event.message) {
              useWorkbenchStore.getState().addLog(event.level ?? "info", event.message);
            }
          },
        ),
      );

      useWorkbenchStore.getState().completeFileThumbnails(file.id, {
        thumbnailPaths: thumbnailMap(thumbnails.thumbnails),
        previewPaths: previewMap(thumbnails.thumbnails),
        message: `${file.name} のページサムネイルを生成しました。`,
      });
    } catch (error) {
      if (error instanceof ProcessingEngineCancelledError) {
        useWorkbenchStore.getState().addLog("info", `${file.name} のサムネイル生成をキャンセルしました。`);
        return;
      }
      useWorkbenchStore
        .getState()
        .addLog("warn", `${file.name} のサムネイル生成に失敗しました: ${normalizeEngineMessage(error)}`);
    }
  })().finally(() => {
    if (inFlightThumbnailFiles.get(fileId) === promise) {
      inFlightThumbnailFiles.delete(fileId);
    }
  });

  inFlightThumbnailFiles.set(fileId, promise);
  return promise;
}

export function renderExportPreviewPageImage(
  pageId: string,
  sessionDir: string,
  options: PreviewPageImageOptions = {},
): Promise<PreviewPageImageResult> {
  const pageLocation = findPageById(pageId);
  if (!pageLocation) {
    return Promise.resolve({ pageId });
  }

  const sourceFileId = pageLocation.page.sourceFileId ?? pageLocation.fileId;
  const sourcePageNumber = pageLocation.page.originalPageNumber || pageLocation.page.pageNumber;
  const previewZoom = Math.max(0.9, Math.min(2.7, options.previewZoom ?? 1.9));
  const zoomKey = Math.round(previewZoom * 100);
  const key = `${sourceFileId}:${sourcePageNumber}:${sessionDir}:${zoomKey}`;
  const existing = inFlightPreviewPageImages.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<PreviewPageImageResult> => {
    const state = useWorkbenchStore.getState();
    const sourceFile = state.files.find((file) => file.id === sourceFileId);
    if (!sourceFile || sourceFile.cacheState !== "ready") {
      return { pageId };
    }

    const pdfPath = sourceFile.cachePath || sourceFile.sourcePath;
    if (!pdfPath || isVirtualSource(pdfPath)) {
      return { pageId };
    }

    const password = state.security.inputPassword;
    const thumbnailDir = joinWorkerPath(
      sessionDir,
      "preview-thumbnails",
      sourceFile.id,
      `z${zoomKey}`,
      String(sourcePageNumber),
    );
    const thumbnailJobId = createProcessingJobId("preview-thumbnail");
    state.addLog("info", `${sourceFile.name} p${sourcePageNumber} のプレビュー画像を生成しています。`);

    try {
      const result = await trackPreparationJob(thumbnailJobId, () =>
        renderPdfThumbnailsStreaming(
          pdfPath,
          thumbnailDir,
          Math.max(sourceFile.pageCount || 0, sourcePageNumber),
          password,
          thumbnailJobId,
          (event) => {
            if (event.type === "log" && event.message) {
              useWorkbenchStore.getState().addLog(event.level ?? "info", event.message);
            }
          },
          {
            pageNumbers: [sourcePageNumber],
            thumbnailZoom: 0.32,
            previewZoom,
          },
        ),
      );
      const thumbnail = result.thumbnails.find((item) => item.pageNumber === sourcePageNumber);
      if (!thumbnail) {
        return { pageId };
      }

      if (pageLocation.fileId === sourceFile.id) {
        useWorkbenchStore.getState().completeFileThumbnails(sourceFile.id, {
          thumbnailPaths: thumbnailMap([thumbnail]),
          previewPaths: previewMap([thumbnail]),
          message: `${sourceFile.name} p${sourcePageNumber} のプレビュー画像を生成しました。`,
        });
      }

      return {
        pageId,
        thumbnailPath: thumbnail.thumbnailPath,
        previewPath: thumbnail.previewPath ?? thumbnail.thumbnailPath,
        previewZoom,
      };
    } catch (error) {
      if (!(error instanceof ProcessingEngineCancelledError)) {
        useWorkbenchStore
          .getState()
          .addLog("warn", `${sourceFile.name} p${sourcePageNumber} のプレビュー画像生成に失敗しました: ${normalizeEngineMessage(error)}`);
      }
      return { pageId };
    }
  })().finally(() => {
    if (inFlightPreviewPageImages.get(key) === promise) {
      inFlightPreviewPageImages.delete(key);
    }
  });

  inFlightPreviewPageImages.set(key, promise);
  return promise;
}

export function processNextPendingEngineFile(sessionDir: string): void {
  if (inFlightFiles.size > 0) {
    return;
  }

  const state = useWorkbenchStore.getState();
  const candidate =
    state.files.find((file) => file.priority && shouldProcessWithEngine(file) && !inFlightFiles.has(file.id)) ??
    state.files.find((file) => shouldProcessWithEngine(file) && !inFlightFiles.has(file.id));

  if (candidate) {
    void processWorkbenchFile(candidate, sessionDir);
  }
}

export async function processAllPendingEngineFiles(sessionDir: string): Promise<void> {
  while (true) {
    throwIfCurrentExportCancelled();
    const state = useWorkbenchStore.getState();
    const activeJobs = state.files
      .map((file) => inFlightFiles.get(file.id))
      .filter((job): job is Promise<void> => Boolean(job));
    if (activeJobs.length > 0) {
      await Promise.allSettled(activeJobs);
      continue;
    }

    const candidate =
      state.files.find((file) => file.priority && shouldProcessWithEngine(file)) ??
      state.files.find(shouldProcessWithEngine);
    if (!candidate) {
      break;
    }
    await processWorkbenchFile(candidate, sessionDir);
  }

  throwIfCurrentExportCancelled();

  const nextState = useWorkbenchStore.getState();
  const blockers = nextState.files.filter((file) => {
    if (file.excluded) {
      return false;
    }
    if (isVirtualSource(file.sourcePath)) {
      return true;
    }
    return file.cacheState !== "ready" || (nextState.pagesByFile[file.id] ?? []).length === 0;
  });
  if (blockers.length > 0) {
    throw new Error(
      `出力できないファイルがあります: ${blockers
        .map((file) => `${file.name}${file.errorMessage ? ` (${file.errorMessage})` : ""}`)
        .join(", ")}`,
    );
  }
}

export function resetCurrentExportCancellation(): void {
  activeExportCancellationRequested = false;
}

export function isCurrentExportCancellationRequested(): boolean {
  return activeExportCancellationRequested;
}

export function isProcessingEngineCancelled(error: unknown): boolean {
  return error instanceof ProcessingEngineCancelledError;
}

function snapshotForExport(): WorkbenchSnapshot {
  const state = useWorkbenchStore.getState();
  const outputPassword = state.security.outputPassword?.trim();
  return {
    files: state.files.map((file) => ({ ...file, metadata: file.metadata ? { ...file.metadata } : undefined })),
    pagesByFile: Object.fromEntries(
      Object.entries(state.pagesByFile).map(([fileId, pages]) => [
        fileId,
        pages.map((page: PageItem) => ({ ...page })),
      ]),
    ),
    activeTool: state.activeTool,
    decorations: state.decorations.map((decoration) => ({ ...decoration })),
    selectedDecorationId: state.selectedDecorationId,
    security: {
      ...state.security,
      encryptOutput: state.security.outputEncrypted,
      userPassword: outputPassword,
      ownerPassword: outputPassword,
    } as WorkbenchSnapshot["security"],
  };
}

function passwordMapForExport(snapshot: WorkbenchSnapshot): Record<string, string> | undefined {
  const password = useWorkbenchStore.getState().security.inputPassword?.trim();
  if (!password) {
    return undefined;
  }
  return Object.fromEntries(
    snapshot.files
      .map((file) => file.cachePath || file.sourcePath)
      .filter((path): path is string => Boolean(path) && !isVirtualSource(path))
      .map((path) => [path, password]),
  );
}

export async function exportCurrentWorkspaceWithEngine(
  destination: string | ExportDestination,
): Promise<ExportWorkspaceResult> {
  throwIfCurrentExportCancelled();
  const snapshot = snapshotForExport();
  const jobId = createProcessingJobId("export");
  activeExportJobId = jobId;
  try {
    return await exportWorkspaceToDestinationStreaming(
      typeof destination === "string" ? { outputPath: destination } : destination,
      snapshot,
      passwordMapForExport(snapshot),
      jobId,
      handleExportEvent,
    );
  } finally {
    if (activeExportJobId === jobId) {
      activeExportJobId = undefined;
    }
  }
}

export async function renderCurrentExportDecorationManifestWithEngine(
  sessionDir: string,
  outputIndex: number,
  pageIndex: number,
): Promise<DecorationLayoutManifest> {
  const snapshot = snapshotForExport();
  return renderExportDecorationManifestPage(
    snapshot,
    joinWorkerPath(sessionDir, "export-preview"),
    outputIndex,
    pageIndex,
    passwordMapForExport(snapshot),
  );
}

export async function renderCurrentExportDecorationOverlayWithEngine(
  sessionDir: string,
  outputIndex: number,
  pageIndex: number,
): Promise<DecorationOverlayRenderResult> {
  const snapshot = snapshotForExport();
  return renderExportDecorationOverlayPage(
    snapshot,
    joinWorkerPath(sessionDir, "export-preview"),
    outputIndex,
    pageIndex,
    passwordMapForExport(snapshot),
  );
}

export async function renderCurrentExportDecorationOverlayFromManifestWithEngine(
  sessionDir: string,
  manifest: DecorationLayoutManifest,
): Promise<DecorationOverlayRenderResult> {
  return renderExportDecorationOverlayFromManifest(
    manifest,
    joinWorkerPath(sessionDir, "export-preview"),
  );
}

function handleExportEvent(event: ProcessingEngineEvent): void {
  const store = useWorkbenchStore.getState();
  if (event.type === "progress") {
    store.setExportJobProgress(event.progress, event.step, event.message);
    return;
  }
  if (event.type === "log") {
    store.addLog(event.level ?? "info", event.message);
  }
}

export async function cancelCurrentExportWithEngine(): Promise<void> {
  activeExportCancellationRequested = true;
  const jobIds = [
    ...activePreparationJobIds,
    ...(activeExportJobId ? [activeExportJobId] : []),
  ];
  await Promise.allSettled(jobIds.map((jobId) => cancelProcessingEngineJob(jobId)));
  useWorkbenchStore.getState().cancelExportJob();
}
