import {
  cancelProcessingEngineJob,
  convertOfficeFileStreaming,
  createProcessingJobId,
  exportWorkspaceToDestinationStreaming,
  type ExportDestination,
  renderExportDecorationManifestPage,
  renderExportDecorationOverlayPage,
  inspectPdfFile,
  ProcessingEngineCancelledError,
  renderPdfThumbnails,
  type DecorationLayoutManifest,
  type DecorationOverlayRenderResult,
  type ExportWorkspaceResult,
  type ProcessingEngineEvent,
} from "./backend";
import { useWorkbenchStore } from "./store";
import type { PageItem, PdfMetadata, WorkbenchFile, WorkbenchSnapshot } from "./types";

const inFlightFiles = new Map<string, Promise<void>>();
let activeExportJobId: string | undefined;
let activeExportCancellationRequested = false;

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
      const converted = await convertOfficeFileStreaming(
        sourcePath,
        sessionDir,
        `${file.id}.pdf`,
        convertJobId,
        (event) => {
          if (event.type === "progress") {
            const progress = Math.max(8, Math.min(56, Math.round(event.progress * 0.56)));
            useWorkbenchStore
              .getState()
              .setFileCacheProgress(file.id, "converting", progress, event.message);
          } else if (event.type === "log" && event.message) {
            useWorkbenchStore.getState().addLog(event.level ?? "info", event.message);
          }
        },
      );
      pdfPath = converted.outputPath ?? converted.cachePath ?? "";
      if (!pdfPath) {
        throw new Error("Office変換後のPDFパスを取得できませんでした。");
      }
      useWorkbenchStore
        .getState()
        .setFileCacheProgress(file.id, "converting", 58, `${file.name} のPDF化が完了しました。ページ解析中です。`);
    }

    const inspection = await inspectPdfFile(pdfPath, password);
    useWorkbenchStore
      .getState()
      .setFileCacheProgress(file.id, "converting", 78, `${file.name} のサムネイルを生成しています。`);

    const thumbnailDir = joinWorkerPath(sessionDir, "thumbnails", file.id);
    const thumbnails = await renderPdfThumbnails(
      pdfPath,
      thumbnailDir,
      inspection.pageCount,
      password,
    );

    useWorkbenchStore.getState().completeFileInspection(file.id, {
      cachePath: pdfPath,
      pageCount: inspection.pageCount,
      metadata: metadataFromInspection(inspection),
      thumbnailPaths: thumbnailMap(thumbnails.thumbnails),
      previewPaths: previewMap(thumbnails.thumbnails),
      engineState: file.kind === "pdf" ? "inspected" : "cached",
      message: `${file.name} を実PDFとして準備しました。${inspection.pageCount}ページ。`,
    });
  } catch (error) {
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

export function processNextPendingEngineFile(sessionDir: string): void {
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
    if (activeExportCancellationRequested) {
      throw new ProcessingEngineCancelledError();
    }
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

  if (activeExportCancellationRequested) {
    throw new ProcessingEngineCancelledError();
  }

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
  if (activeExportCancellationRequested) {
    throw new ProcessingEngineCancelledError();
  }
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
  const jobId = activeExportJobId;
  if (jobId) {
    await cancelProcessingEngineJob(jobId);
  }
  useWorkbenchStore.getState().cancelExportJob();
}
