import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type SyntheticEvent,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BadgeInfo,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Copy,
  Eye,
  ExternalLink,
  FileOutput,
  FilePlus2,
  FileText,
  FolderOpen,
  GripHorizontal,
  Hand,
  Hash,
  Highlighter,
  Info,
  KeyRound,
  ListChecks,
  Loader2,
  Lock,
  Logs,
  PencilLine,
  Redo2,
  Scissors,
  Shield,
  Stamp,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  checkAlphaLicense,
  cleanupCacheSession,
  completeStartup,
  ensureExportDestinationReady,
  getE2eBootstrap,
  openOutputPath,
  prepareCacheSession,
  revealOutputPath,
  writeE2eResult,
  type AlphaLicenseStatus,
  type DecorationLayoutItem,
  type DecorationLayoutManifest,
  type DecorationOverlayRenderResult,
  type E2eBootstrapInfo,
  type ExportDestination,
} from "./features/workbench/backend";
import {
  cancelCurrentExportWithEngine,
  exportCurrentWorkspaceWithEngine,
  isCurrentExportCancellationRequested,
  isProcessingEngineCancelled,
  processAllPendingEngineFiles,
  processNextPendingEngineFile,
  renderCurrentExportDecorationManifestWithEngine,
  renderCurrentExportDecorationOverlayFromManifestWithEngine,
  renderCurrentExportDecorationOverlayWithEngine,
  renderExpandedFileThumbnails,
  renderExportPreviewPageImage,
  resetCurrentExportCancellation,
  type PreviewPageImageResult,
} from "./features/workbench/engineWorkflow";
import {
  browserFilesToInputInfo,
  describeInputPaths,
  droppedFilesToInputInfo,
  isTauriRuntime,
  openInputFilesDialog,
  openOutputFileDialog,
  openOutputFolderDialog,
  supportedExtensions,
} from "./features/workbench/fileInput";
import { useWorkbenchStore } from "./features/workbench/store";
import type {
  Decoration,
  DecorationKind,
  DecorationPosition,
  FileKind,
  OutputPlan,
  PageItem,
  ToolId,
  WorkbenchFile,
} from "./features/workbench/types";

const toolItems: Array<{
  id: ToolId;
  label: string;
  icon: typeof Hand;
  danger?: boolean;
}> = [
  { id: "select", label: "並び替え", icon: Hand },
  { id: "scissors", label: "ハサミ", icon: Scissors },
  { id: "trash", label: "ゴミ箱", icon: Trash2, danger: true },
  { id: "header", label: "ヘッダー", icon: Type },
  { id: "footer", label: "フッター", icon: Highlighter },
  { id: "page-number", label: "ページ番号", icon: Hash },
  { id: "watermark", label: "透かし", icon: Stamp },
  { id: "lock", label: "鍵", icon: Lock },
  { id: "info", label: "情報", icon: Info },
];

const decorationToolIds: DecorationKind[] = [
  "header",
  "footer",
  "page-number",
  "watermark",
];

type FileDropTarget = {
  fileId: string;
  position: "before" | "after";
};

type DragHitRect = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type PanelPosition = {
  left: number;
  top: number;
};

type FilePointerDragRef = {
  fileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  target: FileDropTarget | null;
  active: boolean;
  hitRects: DragHitRect[];
  scrollLeft: number;
};

type FileAutoScrollRef = {
  frame: number | null;
  velocity: number;
  x: number;
  y: number;
  lastTime: number | null;
};

type FileDragPreview = {
  fileId: string;
  x: number;
  y: number;
};

type PageDropTarget = {
  pageId: string;
  position: "before" | "after";
};

type PagePointerDragRef = {
  pageId: string;
  pointerId: number;
  startX: number;
  startY: number;
  lastClientX: number;
  lastClientY: number;
  target: PageDropTarget | null;
  active: boolean;
  hitRects: DragHitRect[];
  scrollLeft: number;
  scrollTop: number;
  sourceElement: HTMLButtonElement | null;
};

type PageAutoScrollRef = {
  frame: number | null;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
  lastTime: number | null;
};

type FileOrderResizeRef = {
  pointerId: number;
  startY: number;
  startHeight: number;
  minHeight: number;
  maxHeight: number;
};

type InternalDragActiveHandler = (active: boolean) => void;

type ExportPreviewPage = PageItem & {
  fileName: string;
  fileKind: FileKind;
};

type ExportPreviewGroup = {
  name: string;
  pages: ExportPreviewPage[];
};

type ExportPreviewFilmstripPage = ExportPreviewPage & {
  outputName: string;
  outputIndex: number;
  outputPageNumber: number;
  outputPageTotal: number;
  globalIndex: number;
  startsOutput: boolean;
};

type DecorationPreviewState = {
  status: "manifest" | "ready" | "error";
  manifest?: DecorationLayoutManifest;
  overlay?: DecorationOverlayRenderResult;
};

type PreviewCanvasSize = {
  width: number;
  height: number;
};

type PreviewPageImageState = Pick<PreviewPageImageResult, "thumbnailPath" | "previewPath" | "previewZoom">;

const decorationPreviewSessionCache = new Map<string, DecorationPreviewState>();
const decorationPreviewSessionPromises = new Map<string, Promise<DecorationLayoutManifest | DecorationOverlayRenderResult>>();
const decorationPreviewMaxCachedPages = 96;
const previewNavigationSettleMs = 140;
const previewNeighborPrefetchDelayMs = 260;
const previewFilmstripItemWidth = 100;
const previewRenderMinLongEdgePx = 1600;
const previewRenderMaxLongEdgePx = 2200;
const standardPdfLongEdgePt = 842;
const defaultPreviewPageAspectRatio = 1 / Math.SQRT2;
const pageTimelineColumnCount = 12;
const pageTimelineRowHeight = 119;
const pageTimelineOverscanRows = 2;
const pageMouseDragPointerId = -1;

type OutputPageNumberInfo = {
  outputPageNumber: number;
  outputPageTotal: number;
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

type ExportCompletionNotice = {
  completedAt: number;
  outputFiles: string[];
};

function kindLabel(kind: FileKind): string {
  switch (kind) {
    case "excel":
      return "Excel";
    case "word":
      return "Word";
    case "powerpoint":
      return "PowerPoint";
    case "pdf":
      return "PDF";
  }
}

function cacheLabel(file: WorkbenchFile): string | undefined {
  if (file.cacheState === "ready") {
    return undefined;
  }
  if (file.cacheState === "queued") {
    return file.priority ? "次にPDF化" : "PDF化待ち";
  }
  if (file.cacheState === "error") {
    return "変換エラー";
  }
  if (file.cacheState === "stale") {
    return "再変換必要";
  }
  return `${file.priority ? "優先" : ""}PDF化中 ${file.progress ?? 0}%`;
}

function conversionQueueLabel(files: WorkbenchFile[]): string {
  const activeFiles = files.filter((file) => !file.excluded);
  const convertingCount = activeFiles.filter((file) => file.cacheState === "converting").length;
  const priorityCount = activeFiles.filter(
    (file) => file.priority && ["queued", "converting", "stale"].includes(file.cacheState),
  ).length;
  const queuedCount = activeFiles.filter((file) => file.cacheState === "queued").length;
  const staleCount = activeFiles.filter((file) => file.cacheState === "stale").length;
  const errorCount = activeFiles.filter((file) => file.cacheState === "error").length;
  const parts: string[] = [];
  if (convertingCount > 0) {
    parts.push(`処理中 ${convertingCount}`);
  }
  if (priorityCount > 0) {
    parts.push(`優先 ${priorityCount}`);
  }
  if (queuedCount > 0) {
    parts.push(`待ち ${queuedCount}`);
  }
  if (staleCount > 0) {
    parts.push(`再変換 ${staleCount}`);
  }
  if (errorCount > 0) {
    parts.push(`エラー ${errorCount}`);
  }
  return parts.length > 0 ? `PDF化: ${parts.join(" / ")}` : "";
}

function pageCountLabel(file: WorkbenchFile): string {
  if (file.cacheState === "ready") {
    return file.pageCount > 0 ? `${file.pageCount}ページ` : "ページ未解析";
  }
  return "順序編集可";
}

function formatSize(bytes?: number): string {
  if (!bytes) {
    return "サイズ未取得";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function localAssetSrc(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  return isTauriRuntime() ? convertFileSrc(path) : path;
}

function plannedOutputNames(outputPlan: OutputPlan): string[] {
  return outputPlan.outputFiles;
}

const invalidOutputNamePattern = /[<>:"/\\|?*\u0000-\u001f]/;
const reservedWindowsNames = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

function withPdfExtension(name: string): string {
  const trimmed = name.trim();
  return /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;
}

function outputNameValidationError(outputNames: string[]): string | null {
  const seen = new Set<string>();

  for (const outputName of outputNames) {
    const name = outputName.trim();
    if (!name) {
      return "空のファイル名があります。";
    }
    if (invalidOutputNamePattern.test(name)) {
      return `使用できない文字を含むファイル名があります: ${name}`;
    }
    if (/[. ]$/.test(name)) {
      return `末尾が空白またはドットのファイル名は使えません: ${name}`;
    }
    const stem = name.replace(/\.pdf$/i, "").toUpperCase();
    if (stem === "." || stem === ".." || reservedWindowsNames.has(stem)) {
      return `Windows予約名は使えません: ${name}`;
    }

    const normalized = name.toLocaleLowerCase();
    if (seen.has(normalized)) {
      return `重複したファイル名があります: ${name}`;
    }
    seen.add(normalized);
  }

  return null;
}

function buildExportPreviewGroups(
  files: WorkbenchFile[],
  pagesByFile: Record<string, PageItem[]>,
  outputPlan: OutputPlan,
): ExportPreviewGroup[] {
  const outputNames = plannedOutputNames(outputPlan);
  if (outputNames.length === 0) {
    return [];
  }

  const groups = outputNames.map((name) => ({ name, pages: [] as ExportPreviewPage[] }));
  let groupIndex = 0;

  for (const file of files) {
    if (file.excluded) {
      continue;
    }

    for (const page of pagesByFile[file.id] ?? []) {
      if (page.excluded) {
        continue;
      }

      groups[groupIndex].pages.push({
        ...page,
        fileName: file.name,
        fileKind: file.kind,
      });

      if (page.splitAfter && groupIndex < groups.length - 1) {
        groupIndex += 1;
      }
    }
  }

  return groups;
}

function flattenExportPreviewGroups(
  groups: ExportPreviewGroup[],
): ExportPreviewFilmstripPage[] {
  return groups.flatMap((group, outputIndex) =>
    group.pages.map((page, pageIndex) => ({
      ...page,
      outputName: group.name,
      outputIndex,
      outputPageNumber: pageIndex + 1,
      outputPageTotal: group.pages.length,
      globalIndex: groups
        .slice(0, outputIndex)
        .reduce((count, item) => count + item.pages.length, pageIndex),
      startsOutput: outputIndex > 0 && pageIndex === 0,
    })),
  );
}

function exportPreviewSignature(
  files: WorkbenchFile[],
  pagesByFile: Record<string, PageItem[]>,
  decorations: Decoration[],
  outputPlan: OutputPlan,
): string {
  return JSON.stringify({
    files: files.map((file) => ({
      id: file.id,
      sourcePath: file.sourcePath,
      cachePath: file.cachePath,
      kind: file.kind,
      excluded: file.excluded,
      cacheState: file.cacheState,
      engineState: file.engineState,
    })),
    pagesByFile: Object.fromEntries(
      Object.entries(pagesByFile).map(([fileId, pages]) => [
        fileId,
        pages.map((page) => ({
          id: page.id,
          fileId: page.fileId,
          sourceFileId: page.sourceFileId,
          pageNumber: page.pageNumber,
          originalPageNumber: page.originalPageNumber,
          excluded: page.excluded,
          selected: page.selected,
          splitAfter: page.splitAfter,
        })),
      ]),
    ),
    decorations: decorations.map((decoration) => ({
      id: decoration.id,
      kind: decoration.kind,
      text: decoration.text,
      target: decoration.target,
      position: decoration.position,
      pageId: decoration.pageId,
      fileId: decoration.fileId,
      outputIndex: decoration.outputIndex,
      excludedPageIds: decoration.excludedPageIds,
      fontSize: decoration.fontSize,
      opacity: decoration.opacity,
      color: decoration.color,
    })),
    outputPlan: {
      outputFiles: outputPlan.outputFiles,
      activeFileCount: outputPlan.activeFileCount,
      activePageCount: outputPlan.activePageCount,
      splitCount: outputPlan.splitCount,
      decorationCount: outputPlan.decorationCount,
    },
  });
}

function decorationPreviewKey(page: ExportPreviewFilmstripPage): string {
  return `${page.outputIndex}:${page.outputPageNumber}:${page.id}:${page.globalIndex}`;
}

function decorationPreviewCacheKey(previewSignature: string, page: ExportPreviewFilmstripPage): string {
  return `${previewSignature}:${decorationPreviewKey(page)}`;
}

function rememberDecorationPreviewCache(cacheKey: string, state: DecorationPreviewState): void {
  if (state.status === "error") {
    return;
  }
  const current = decorationPreviewSessionCache.get(cacheKey);
  const nextState =
    current && state.status === "manifest" && current.status === "ready"
      ? current
      : { ...current, ...state };
  decorationPreviewSessionCache.set(cacheKey, nextState);
  while (decorationPreviewSessionCache.size > decorationPreviewMaxCachedPages) {
    const oldestKey = decorationPreviewSessionCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    decorationPreviewSessionCache.delete(oldestKey);
  }
}

function cachedDecorationPreviewPages(
  previewSignature: string,
  pages: ExportPreviewFilmstripPage[],
): Record<string, DecorationPreviewState> {
  return Object.fromEntries(
    pages
      .map((page) => {
        const pageKey = decorationPreviewKey(page);
        const cacheKey = decorationPreviewCacheKey(previewSignature, page);
        const cached = decorationPreviewSessionCache.get(cacheKey);
        return cached?.status === "ready" || cached?.status === "manifest"
          ? ([pageKey, cached] as const)
          : undefined;
      })
      .filter((entry): entry is readonly [string, DecorationPreviewState] => Boolean(entry)),
  );
}

function previewPageFrameStyle(
  aspectRatio: number | undefined,
  canvasSize: PreviewCanvasSize | null,
): CSSProperties {
  const ratio =
    typeof aspectRatio === "number" && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : defaultPreviewPageAspectRatio;

  if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0) {
    return {
      aspectRatio: String(ratio),
      width: "min(100%, 520px)",
    };
  }

  const availableWidth = Math.max(96, canvasSize.width - 16);
  const availableHeight = Math.max(96, canvasSize.height - 16);
  let width = availableWidth;
  let height = width / ratio;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * ratio;
  }

  return {
    aspectRatio: String(ratio),
    width: `${Math.max(32, Math.round(width))}px`,
    height: `${Math.max(32, Math.round(height))}px`,
  };
}

function previewRenderZoomForCanvas(
  canvasSize: PreviewCanvasSize | null,
  aspectRatio: number | undefined,
): number {
  if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0) {
    return 1.9;
  }

  const ratio =
    typeof aspectRatio === "number" && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : defaultPreviewPageAspectRatio;
  const availableWidth = Math.max(96, canvasSize.width - 16);
  const availableHeight = Math.max(96, canvasSize.height - 16);
  let width = availableWidth;
  let height = width / ratio;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * ratio;
  }

  const displayLongEdge = Math.max(width, height);
  const pixelRatio =
    typeof window === "undefined"
      ? 1
      : Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const targetLongEdge = Math.max(
    previewRenderMinLongEdgePx,
    Math.min(previewRenderMaxLongEdgePx, displayLongEdge * pixelRatio * 1.35),
  );
  const zoom = targetLongEdge / standardPdfLongEdgePt;
  return Math.max(1.45, Math.min(2.65, Number(zoom.toFixed(2))));
}

function requestDecorationManifestPage(
  sessionPath: string,
  previewSignature: string,
  page: ExportPreviewFilmstripPage,
): Promise<DecorationLayoutManifest> {
  const cacheKey = decorationPreviewCacheKey(previewSignature, page);
  const cached = decorationPreviewSessionCache.get(cacheKey);
  if ((cached?.status === "manifest" || cached?.status === "ready") && cached.manifest) {
    return Promise.resolve(cached.manifest);
  }

  const promiseKey = `${cacheKey}:manifest`;
  const existingPromise = decorationPreviewSessionPromises.get(promiseKey);
  if (existingPromise) {
    return existingPromise as Promise<DecorationLayoutManifest>;
  }

  const promise = renderCurrentExportDecorationManifestWithEngine(
    sessionPath,
    page.outputIndex,
    page.outputPageNumber - 1,
  )
    .then((manifest) => {
      rememberDecorationPreviewCache(cacheKey, { status: "manifest", manifest });
      return manifest;
    })
    .finally(() => {
      if (decorationPreviewSessionPromises.get(promiseKey) === promise) {
        decorationPreviewSessionPromises.delete(promiseKey);
      }
    });
  decorationPreviewSessionPromises.set(promiseKey, promise);
  return promise;
}

function requestDecorationOverlayPage(
  sessionPath: string,
  previewSignature: string,
  page: ExportPreviewFilmstripPage,
  manifest?: DecorationLayoutManifest,
): Promise<DecorationOverlayRenderResult> {
  const cacheKey = decorationPreviewCacheKey(previewSignature, page);
  const cached = decorationPreviewSessionCache.get(cacheKey);
  if (cached?.status === "ready" && cached.overlay) {
    return Promise.resolve(cached.overlay);
  }

  const promiseKey = `${cacheKey}:overlay`;
  const existingPromise = decorationPreviewSessionPromises.get(promiseKey);
  if (existingPromise) {
    return existingPromise as Promise<DecorationOverlayRenderResult>;
  }

  const promise = (manifest
    ? renderCurrentExportDecorationOverlayFromManifestWithEngine(sessionPath, manifest)
    : renderCurrentExportDecorationOverlayWithEngine(
        sessionPath,
        page.outputIndex,
        page.outputPageNumber - 1,
      ))
    .then((overlay) => {
      rememberDecorationPreviewCache(cacheKey, {
        status: "ready",
        manifest: overlay,
        overlay,
      });
      return overlay;
    })
    .finally(() => {
      if (decorationPreviewSessionPromises.get(promiseKey) === promise) {
        decorationPreviewSessionPromises.delete(promiseKey);
      }
    });
  decorationPreviewSessionPromises.set(promiseKey, promise);
  return promise;
}

function buildOutputPageNumberMap(
  files: WorkbenchFile[],
  pagesByFile: Record<string, PageItem[]>,
  outputPlan: OutputPlan,
): Record<string, OutputPageNumberInfo> {
  const outputCount = plannedOutputNames(outputPlan).length;
  if (outputCount === 0) {
    return {};
  }

  const groupTotals = Array.from({ length: outputCount }, () => 0);
  let groupIndex = 0;
  for (const file of files) {
    if (file.excluded) {
      continue;
    }
    for (const page of pagesByFile[file.id] ?? []) {
      if (page.excluded) {
        continue;
      }
      groupTotals[groupIndex] += 1;
      if (page.splitAfter && groupIndex < outputCount - 1) {
        groupIndex += 1;
      }
    }
  }

  const pageNumbers: Record<string, OutputPageNumberInfo> = {};
  const groupPageNumbers = Array.from({ length: outputCount }, () => 0);
  groupIndex = 0;
  for (const file of files) {
    if (file.excluded) {
      continue;
    }
    for (const page of pagesByFile[file.id] ?? []) {
      if (page.excluded) {
        continue;
      }
      groupPageNumbers[groupIndex] += 1;
      pageNumbers[page.id] = {
        outputPageNumber: groupPageNumbers[groupIndex],
        outputPageTotal: groupTotals[groupIndex],
      };
      if (page.splitAfter && groupIndex < outputCount - 1) {
        groupIndex += 1;
      }
    }
  }
  return pageNumbers;
}

function withOutputPageNumber<T extends PageItem>(
  page: T,
  outputPageNumbers: Record<string, OutputPageNumberInfo>,
): T & Partial<OutputPageNumberInfo> {
  const outputPageNumber = outputPageNumbers[page.id];
  return outputPageNumber ? { ...page, ...outputPageNumber } : page;
}

function decorationLabel(kind: DecorationKind): string {
  switch (kind) {
    case "header":
      return "ヘッダー";
    case "footer":
      return "フッター";
    case "page-number":
      return "ページ番号";
    case "watermark":
      return "透かし";
  }
}

function AlphaExpiredScreen({ license }: { license: AlphaLicenseStatus }) {
  return (
    <div className="alpha-expired-shell">
      <section className="alpha-expired-card" role="alert" aria-live="assertive">
        <div className="brand-mark">PDF</div>
        <h1>PDF Workbench</h1>
        <strong>アルファ版の利用期限が終了しました</strong>
        <p>
          この限定版は {license.expiresOn} まで利用可能です。期限後は作業画面を開けません。
        </p>
        <small>{license.message ?? "アルファ版ライセンスの有効期限が終了しました。"}</small>
      </section>
    </div>
  );
}

function ConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}) {
  const [selectedAction, setSelectedAction] = useState<"cancel" | "confirm">("cancel");
  const selectedActionRef = useRef<"cancel" | "confirm">("cancel");
  const dialogRef = useRef<HTMLElement | null>(null);

  const selectAction = useCallback((action: "cancel" | "confirm") => {
    selectedActionRef.current = action;
    setSelectedAction(action);
  }, []);

  useEffect(() => {
    if (!dialog) {
      return undefined;
    }
    selectAction("cancel");
    window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
          return;
        }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        selectAction("cancel");
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        selectAction("confirm");
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (selectedActionRef.current === "confirm") {
          dialog.onConfirm();
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [dialog, onClose, selectAction]);

  if (!dialog) {
    return null;
  }

  return (
    <div className="modal-backdrop confirm-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={dialog.title}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div>
          <h2>{dialog.title}</h2>
          <p>{dialog.message}</p>
        </div>
        <div className="confirm-actions">
          <button
            className={selectedAction === "cancel" ? "is-key-selected" : ""}
            onClick={onClose}
            onMouseEnter={() => selectAction("cancel")}
            type="button"
          >
            {dialog.cancelLabel}
          </button>
          <button
            className={[
              dialog.danger ? "danger-action" : "primary-action",
              selectedAction === "confirm" ? "is-key-selected" : "",
            ].join(" ")}
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            onMouseEnter={() => selectAction("confirm")}
            type="button"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function outputDisplayName(pathOrName: string): string {
  return pathOrName.split(/[\\/]/).pop() ?? pathOrName;
}

function ExportCompletionPopup({
  notice,
  onClose,
}: {
  notice: ExportCompletionNotice | null;
  onClose: () => void;
}) {
  if (!notice) {
    return null;
  }

  const outputNames = notice.outputFiles.map(outputDisplayName);
  const outputSummary =
    outputNames.length === 0
      ? "PDFの出力が完了しました。"
      : outputNames.length === 1
        ? outputNames[0]
        : `${outputNames.length}ファイル: ${outputNames.join(", ")}`;

  return (
    <aside className="export-completion-popup" role="status" aria-live="polite">
      <div className="export-completion-icon">
        <FileOutput size={18} />
      </div>
      <div className="export-completion-text">
        <strong>出力が完了しました</strong>
        <p title={outputSummary}>{outputSummary}</p>
      </div>
      <button onClick={onClose} type="button" aria-label="完了通知を閉じる">
        <X size={15} />
      </button>
    </aside>
  );
}

function OutputNameEditorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const applyOutputSettings = useWorkbenchStore((state) => state.applyOutputSettings);
  const resetOutputSettings = useWorkbenchStore((state) => state.resetOutputSettings);
  const [destinationDir, setDestinationDir] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDestinationDir(outputPlan.outputDestinationDir ?? "");
    setNames(plannedOutputNames(outputPlan));
    setError("");
    setResetConfirmOpen(false);
  }, [open, outputPlan]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const updateName = (index: number, value: string) => {
    setNames((current) => current.map((name, itemIndex) => (itemIndex === index ? value : name)));
    setError("");
  };

  const chooseDestination = async () => {
    if (!isTauriRuntime()) {
      setError("保存先フォルダの選択はデスクトップ版で利用できます。");
      return;
    }

    try {
      const selected = await openOutputFolderDialog();
      if (selected) {
        setDestinationDir(selected);
        setError("");
      }
    } catch (error) {
      setError(`保存先フォルダを選択できませんでした: ${errorMessage(error)}`);
    }
  };

  const applySettings = () => {
    const destination = destinationDir.trim();
    if (!destination) {
      setError("保存先フォルダを選択してください。");
      return;
    }

    const normalizedNames = names.map((name) => withPdfExtension(name));
    const validationError = outputNameValidationError(normalizedNames);
    if (validationError) {
      setError(validationError);
      return;
    }

    applyOutputSettings(destination, normalizedNames);
    onClose();
  };

  const confirmReset = () => {
    resetOutputSettings();
    onClose();
  };

  return (
    <div className="modal-backdrop output-name-backdrop" role="presentation">
      <section
        className="output-name-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="output-name-editor-title"
      >
        <div className="modal-heading">
          <span id="output-name-editor-title">
            <PencilLine size={18} />
            出力ファイル名
          </span>
          <button className="icon-button" aria-label="閉じる" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <label className="destination-field">
          保存先フォルダ
          <div>
            <input
              value={destinationDir}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDestinationDir(event.target.value);
                setError("");
              }}
              placeholder="保存先フォルダを選択"
            />
            <button onClick={() => void chooseDestination()} type="button">
              <FolderOpen size={16} />
              選択
            </button>
          </div>
        </label>

        <div className="output-name-list">
          {names.length === 0 ? (
            <div className="output-name-empty">書き出し対象がありません。</div>
          ) : (
            names.map((name, index) => (
              <label key={`${index}:${outputPlan.autoOutputFiles[index] ?? name}`}>
                <span>{index + 1}</span>
                <input
                  value={name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateName(index, event.target.value)
                  }
                />
              </label>
            ))
          )}
        </div>

        {error && <div className="output-name-error">{error}</div>}

        {resetConfirmOpen && (
          <div className="output-reset-confirm">
            <span>出力名と保存先を自動設定に戻しますか。</span>
            <button onClick={() => setResetConfirmOpen(false)} type="button">
              キャンセル
            </button>
            <button className="danger-action" onClick={confirmReset} type="button">
              リセット
            </button>
          </div>
        )}

        <div className="output-name-actions">
          <button
            disabled={!outputPlan.customOutputNamesApplied}
            onClick={() => setResetConfirmOpen(true)}
            type="button"
          >
            リセット
          </button>
          <button onClick={onClose} type="button">
            キャンセル
          </button>
          <button
            className="primary-action"
            disabled={names.length === 0}
            onClick={applySettings}
            type="button"
          >
            適用
          </button>
        </div>
      </section>
    </div>
  );
}

function AppBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectingFiles, setSelectingFiles] = useState(false);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [outputNameEditorOpen, setOutputNameEditorOpen] = useState(false);
  const undo = useWorkbenchStore((state) => state.undo);
  const redo = useWorkbenchStore((state) => state.redo);
  const canUndo = useWorkbenchStore((state) => state.canUndo);
  const canRedo = useWorkbenchStore((state) => state.canRedo);
  const addInputFiles = useWorkbenchStore((state) => state.addInputFiles);
  const addLog = useWorkbenchStore((state) => state.addLog);
  const startExportJob = useWorkbenchStore((state) => state.startExportJob);
  const setExportJobProgress = useWorkbenchStore((state) => state.setExportJobProgress);
  const completeExportJob = useWorkbenchStore((state) => state.completeExportJob);
  const failExportJob = useWorkbenchStore((state) => state.failExportJob);
  const exportJob = useWorkbenchStore((state) => state.exportJob);
  const cacheSession = useWorkbenchStore((state) => state.cacheSession);
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);

  const handleAddFiles = async () => {
    if (selectingFiles) {
      return;
    }

    if (!isTauriRuntime()) {
      inputRef.current?.click();
      return;
    }

    setSelectingFiles(true);
    try {
      const files = await openInputFilesDialog();
      if (files && files.length > 0) {
        addInputFiles(files);
      } else {
        addLog("info", "ファイル追加はキャンセルされました。");
      }
    } catch (error) {
      addLog("error", `ファイル選択に失敗しました: ${errorMessage(error)}`);
      inputRef.current?.click();
    } finally {
      setSelectingFiles(false);
    }
  };

  const handleFallbackChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      addInputFiles(browserFilesToInputInfo(event.target.files));
    }
    event.target.value = "";
  };

  const handleExport = async () => {
    if (exportJob.status === "running") {
      return;
    }

    if (outputPlan.activeFileCount === 0) {
      addLog("warn", "書き出し対象のファイルがありません。ファイルを追加してください。");
      return;
    }

    if (!isTauriRuntime()) {
      startExportJob();
      return;
    }

    let destination: ExportDestination;
    try {
      if (outputPlan.customOutputNamesApplied && outputPlan.outputDestinationDir) {
        destination = {
          outputDir: outputPlan.outputDestinationDir,
          outputNames: outputPlan.outputFiles,
        };
        addLog("info", `設定済みの保存先を使用します: ${outputPlan.outputDestinationDir}`);
      } else {
        const selected = await openOutputFileDialog(outputPlan.defaultOutputFileName);
        if (!selected) {
        addLog("warn", "出力ファイルの選択がキャンセルされました。");
        return;
      }
        destination = { outputPath: selected };
      addLog("info", `出力ファイルを指定しました: ${selected}`);
      }

      const preflight = await ensureExportDestinationReady(destination);
      preflight.issues
        .filter((issue) => issue.level === "warn")
        .forEach((issue) =>
          addLog("warn", `${issue.message}${issue.target ? `: ${issue.target}` : ""}`),
        );
    } catch (error) {
      addLog("error", `出力ファイルを指定できませんでした: ${errorMessage(error)}`);
      return;
    }

    if (!cacheSession.path) {
      failExportJob("一時キャッシュが未初期化です。アプリを再起動してください。");
      return;
    }

    resetCurrentExportCancellation();
    startExportJob();
    try {
      setExportJobProgress(8, "Office変換", "入力ファイルを実PDFとして準備中");
      await processAllPendingEngineFiles(cacheSession.path);
      if (isCurrentExportCancellationRequested()) {
        return;
      }
      setExportJobProgress(66, "結合", "PDFを書き出し中");
      const result = await exportCurrentWorkspaceWithEngine(destination);
      completeExportJob(result.outputFiles);
    } catch (error) {
      if (isProcessingEngineCancelled(error)) {
        return;
      }
      failExportJob(errorMessage(error));
    }
  };

  const requestExportPreview = () => {
    if (exportJob.status === "running") {
      return;
    }

    if (outputPlan.activeFileCount === 0) {
      addLog("warn", "書き出し対象のファイルがありません。ファイルを追加してください。");
      return;
    }

    setExportPreviewOpen(true);
  };

  return (
    <>
    <header className="app-bar">
      <div className="brand">
        <div className="brand-mark">PDF</div>
        <div>
          <h1>PDF Workbench</h1>
          <p>変換、結合、分割、装飾を一括で組み立て</p>
        </div>
      </div>

      <div className="app-actions">
        <button
          className="primary-action"
          disabled={selectingFiles}
          onClick={handleAddFiles}
        >
          <FilePlus2 size={17} />
          ファイル追加
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          multiple={true}
          accept={supportedExtensions.map((extension) => `.${extension}`).join(",")}
          onChange={handleFallbackChange}
        />
        <button
          className="icon-button"
          aria-label="元に戻す"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="やり直す"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 size={18} />
        </button>
        <button
          disabled={exportJob.status === "running" || outputPlan.activeFileCount === 0}
          onClick={() => setOutputNameEditorOpen(true)}
          title="カット後の複数出力ファイル名を一括編集"
          type="button"
        >
          <PencilLine size={17} />
          出力名
        </button>
        {exportJob.status !== "idle" && (
          <div className="job-pill">
            <span
              className={[
                "pulse",
                exportJob.status === "running" ? "is-running" : "",
                exportJob.status === "completed" ? "is-complete" : "",
              ].join(" ")}
            />
            {exportJob.message}
          </div>
        )}
        <button
          disabled={exportJob.status === "running" || outputPlan.activeFileCount === 0}
          onClick={requestExportPreview}
        >
          <Eye size={17} />
          プレビュー
        </button>
        <button
          className="export-button"
          disabled={exportJob.status === "running" || outputPlan.activeFileCount === 0}
          onClick={() => void handleExport()}
        >
          <FileOutput size={17} />
          書き出し
        </button>
      </div>
    </header>
    <ExportPreviewModal
      open={exportPreviewOpen}
      onClose={() => setExportPreviewOpen(false)}
      onConfirm={() => {
        setExportPreviewOpen(false);
        void handleExport();
      }}
    />
    <OutputNameEditorModal
      open={outputNameEditorOpen}
      onClose={() => setOutputNameEditorOpen(false)}
    />
    </>
  );
}

function ToolBar() {
  const activeTool = useWorkbenchStore((state) => state.activeTool);
  const setActiveTool = useWorkbenchStore((state) => state.setActiveTool);

  const handleToolDragStart = (event: DragEvent<HTMLButtonElement>, toolId: ToolId) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/pdf-workbench-tool", toolId);
    event.dataTransfer.setData("text/plain", toolId);
  };

  return (
    <nav className="tool-bar" aria-label="PDF編集ツール">
      {toolItems.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            className={[
              "tool-button",
              activeTool === tool.id ? "is-active" : "",
              tool.danger ? "is-danger" : "",
            ].join(" ")}
            draggable={tool.id !== "select"}
            key={tool.id}
            title={tool.label}
            onClick={() => setActiveTool(tool.id)}
            onDragStart={(event) => handleToolDragStart(event, tool.id)}
          >
            <Icon size={18} />
            <span>{tool.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function FileCard({
  file,
  index,
  fileCount,
  thumbnailPath,
  outputPageNumbers,
  draggingFileId,
  dropTarget,
  onPointerDragStart,
  onPointerDragMove,
  onPointerDragEnd,
  onPointerDragCancel,
  onRequestRemoveFiles,
}: {
  file: WorkbenchFile;
  index: number;
  fileCount: number;
  thumbnailPath?: string;
  outputPageNumbers: Record<string, OutputPageNumberInfo>;
  draggingFileId: string | null;
  dropTarget: FileDropTarget | null;
  onPointerDragStart: (event: React.PointerEvent<HTMLElement>, fileId: string) => void;
  onPointerDragMove: (event: React.PointerEvent<HTMLElement>, fileId: string) => boolean;
  onPointerDragEnd: (event: React.PointerEvent<HTMLElement>, fileId: string) => boolean;
  onPointerDragCancel: (event: React.PointerEvent<HTMLElement>, fileId: string) => void;
  onRequestRemoveFiles: (files: WorkbenchFile[]) => void;
}) {
  const ready = file.cacheState === "ready";
  const thumbnailSrc = localAssetSrc(thumbnailPath);
  const toggleFileExpanded = useWorkbenchStore(
    (state) => state.toggleFileExpanded,
  );
  const activeTool = useWorkbenchStore((state) => state.activeTool);
  const selectFile = useWorkbenchStore((state) => state.selectFile);
  const files = useWorkbenchStore((state) => state.files);
  const moveFile = useWorkbenchStore((state) => state.moveFile);
  const applyDecorationToTarget = useWorkbenchStore(
    (state) => state.applyDecorationToTarget,
  );
  const decorations = useWorkbenchStore((state) => state.decorations);
  const pagesByFile = useWorkbenchStore((state) => state.pagesByFile);
  const prioritizeFileConversion = useWorkbenchStore(
    (state) => state.prioritizeFileConversion,
  );
  const statusLabel = cacheLabel(file);
  const filePages = pagesByFile[file.id] ?? [];
  const previewPage =
    filePages.find((page) => !page.excluded) ??
    filePages[0];
  const outputPreviewPage = previewPage
    ? withOutputPageNumber(previewPage, outputPageNumbers)
    : undefined;
  const previewDecorations = fileWideDecorations(file, filePages, decorations);
  const dropClass =
    dropTarget?.fileId === file.id ? `is-drop-${dropTarget.position}` : "";
  const clickGuardRef = useRef(false);
  const confirmRemoveFile = () => {
    const targets = file.selected ? files.filter((item) => item.selected) : [file];
    onRequestRemoveFiles(targets.length > 0 ? targets : [file]);
  };
  const activateFile = () => {
    if (decorationToolIds.includes(activeTool as DecorationKind)) {
      applyDecorationToTarget(activeTool as DecorationKind, { fileId: file.id });
      return;
    }
    if (activeTool === "trash") {
      confirmRemoveFile();
      return;
    }
    if (ready) {
      toggleFileExpanded(file.id);
      return;
    }
    prioritizeFileConversion(file.id);
  };
  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (
      clickGuardRef.current ||
      (target instanceof HTMLElement && target.closest("button"))
    ) {
      return;
    }
    if (activeTool === "select" && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      selectFile(
        file.id,
        event.shiftKey ? "range" : event.ctrlKey || event.metaKey ? "toggle" : "replace",
      );
      return;
    }
    activateFile();
  };
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    activateFile();
  };
  const handleCardPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target;
    if (
      (event.button !== 0 && event.buttons !== 1) ||
      isTextInputTarget(target) ||
      (target instanceof HTMLElement && target.closest("button"))
    ) {
      return;
    }
    onPointerDragStart(event, file.id);
  };
  const handleCardPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (onPointerDragMove(event, file.id)) {
      clickGuardRef.current = true;
    }
  };
  const handleCardPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (onPointerDragEnd(event, file.id)) {
      clickGuardRef.current = true;
      window.setTimeout(() => {
        clickGuardRef.current = false;
      }, 0);
    }
  };
  const handleCardPointerCancel = (event: React.PointerEvent<HTMLElement>) => {
    onPointerDragCancel(event, file.id);
  };

  return (
    <article
      className={[
        "file-card",
        ready ? "is-ready" : "is-pending",
        file.excluded ? "is-excluded" : "",
        file.selected ? "is-selected" : "",
        draggingFileId === file.id ? "is-dragging" : "",
        dropClass,
      ].join(" ")}
      tabIndex={0}
      data-file-card-id={file.id}
      data-decoration-target={
        decorationToolIds.includes(activeTool as DecorationKind) ? "file" : undefined
      }
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onPointerDown={handleCardPointerDown}
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerCancel}
      title={
        ready
          ? file.expanded
            ? "クリックでページタイムラインを閉じる"
            : "クリックでページタイムラインを展開"
          : "クリックでPDF化を優先"
      }
    >
      <div className="file-card-topline">
        <span className={`kind-badge kind-${file.kind}`}>{kindLabel(file.kind)}</span>
        <div className="file-order-controls" aria-label="ファイル順序">
          <button
            className="order-button"
            disabled={index === 0}
            onClick={() => moveFile(file.id, -1)}
            title="前へ移動"
            type="button"
          >
            <ArrowUp size={14} />
          </button>
          <button
            className="order-button"
            disabled={index === fileCount - 1}
            onClick={() => moveFile(file.id, 1)}
            title="後ろへ移動"
            type="button"
          >
            <ArrowDown size={14} />
          </button>
        </div>
      </div>
      <div className="file-preview">
        <div className="file-preview-paper-wrap">
          <div className={["preview-paper", thumbnailSrc ? "has-thumbnail" : ""].join(" ")}>
            {thumbnailSrc ? (
              <img className="file-thumbnail" src={thumbnailSrc} alt="" draggable={false} />
            ) : ready ? (
              <FileText size={32} />
            ) : (
              <Loader2 size={32} />
            )}
            {outputPreviewPage && (
              <PageDecorations page={outputPreviewPage} decorations={previewDecorations} />
            )}
          </div>
          <span className="file-order-badge">{index + 1}</span>
        </div>
        {statusLabel && (
          <div className="file-preview-side">
            <span className={`cache-badge state-${file.cacheState}`}>{statusLabel}</span>
          </div>
        )}
      </div>
      <div className="file-name" title={file.name}>
        {file.name}
      </div>
      <div className={["file-detail-row", file.errorMessage ? "has-error" : ""].join(" ")}>
        {file.errorMessage ? (
          <span className="file-error" title={file.errorMessage}>
            {file.errorMessage}
          </span>
        ) : (
          <>
            <span>{file.extension?.toUpperCase() ?? "形式未取得"}</span>
            <span>{pageCountLabel(file)}</span>
            <span>{formatSize(file.sizeBytes)}</span>
          </>
        )}
      </div>
      <div className="file-card-actions">
        <button onClick={confirmRemoveFile}>
          除外
        </button>
        <button
          className="expand-button"
          onClick={() =>
            ready ? toggleFileExpanded(file.id) : prioritizeFileConversion(file.id)
          }
        >
          {file.expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          {ready ? (file.expanded ? "展開中" : "展開") : "優先"}
        </button>
      </div>
    </article>
  );
}

function FileStrip({
  onInternalDragActiveChange = () => undefined,
  onRequestRemoveFiles,
}: {
  onInternalDragActiveChange?: InternalDragActiveHandler;
  onRequestRemoveFiles: (files: WorkbenchFile[]) => void;
}) {
  const files = useWorkbenchStore((state) => state.files);
  const pagesByFile = useWorkbenchStore((state) => state.pagesByFile);
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const moveFileToIndex = useWorkbenchStore((state) => state.moveFileToIndex);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<FileDropTarget | null>(null);
  const [dragPreview, setDragPreview] = useState<FileDragPreview | null>(null);
  const pointerDragRef = useRef<FilePointerDragRef | null>(null);
  const fileStripRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<FileAutoScrollRef>({
    frame: null,
    velocity: 0,
    x: 0,
    y: 0,
    lastTime: null,
  });
  const outputPageNumbers = useMemo(
    () => buildOutputPageNumberMap(files, pagesByFile, outputPlan),
    [files, pagesByFile, outputPlan],
  );

  const firstThumbnailPath = (fileId: string) =>
    pagesByFile[fileId]?.find((page) => Boolean(page.thumbnailPath))?.thumbnailPath;

  const captureFileHitRects = (): DragHitRect[] =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-file-card-id]"))
      .map((card) => {
        const rect = card.getBoundingClientRect();
        const id = card.dataset.fileCardId;
        if (!id) {
          return null;
        }
        return {
          id,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
      })
      .filter((rect): rect is DragHitRect => Boolean(rect));

  const fileDropTargetFromPoint = (clientX: number, clientY: number): FileDropTarget | null => {
    const drag = pointerDragRef.current;
    const hitRects = drag?.hitRects ?? [];
    if (hitRects.length === 0) {
      return null;
    }

    const scrollDelta = (fileStripRef.current?.scrollLeft ?? drag?.scrollLeft ?? 0) - (drag?.scrollLeft ?? 0);
    const adjustedRects = hitRects.map((rect) => ({
      ...rect,
      left: rect.left - scrollDelta,
      right: rect.right - scrollDelta,
      centerX: rect.centerX - scrollDelta,
    }));
    const hitRect = adjustedRects.find(
      (rect) =>
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom,
    );
    const targetRect =
      hitRect ??
      adjustedRects.reduce<DragHitRect | null>((closest, rect) => {
        if (!closest) {
          return rect;
        }
        const distance = Math.hypot(clientX - rect.centerX, clientY - rect.centerY);
        const closestDistance = Math.hypot(
          clientX - closest.centerX,
          clientY - closest.centerY,
        );
        return distance < closestDistance ? rect : closest;
      }, null);

    if (!targetRect) {
      return null;
    }

    return {
      fileId: targetRect.id,
      position: clientX > targetRect.centerX ? "after" : "before",
    };
  };

  const updateDragTarget = (clientX: number, clientY: number) => {
    const drag = pointerDragRef.current;
    if (!drag?.active) {
      return;
    }
    const nextTarget = fileDropTargetFromPoint(clientX, clientY);
    drag.target = nextTarget;
    setDropTarget(nextTarget);
    setDragPreview({ fileId: drag.fileId, x: clientX, y: clientY });
  };

  const stopFileAutoScroll = () => {
    const autoScroll = autoScrollRef.current;
    if (autoScroll.frame !== null) {
      window.cancelAnimationFrame(autoScroll.frame);
    }
    autoScroll.frame = null;
    autoScroll.velocity = 0;
    autoScroll.lastTime = null;
  };

  const runFileAutoScroll = (timestamp: number) => {
    const autoScroll = autoScrollRef.current;
    const strip = fileStripRef.current;
    const drag = pointerDragRef.current;
    if (!strip || !drag?.active || autoScroll.velocity === 0) {
      stopFileAutoScroll();
      return;
    }

    const elapsedMs =
      autoScroll.lastTime === null ? 16.7 : timestamp - autoScroll.lastTime;
    autoScroll.lastTime = timestamp;
    const deltaSeconds = Math.min(0.05, Math.max(0.001, elapsedMs / 1000));
    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const nextScrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, strip.scrollLeft + autoScroll.velocity * deltaSeconds),
    );

    if (Math.abs(nextScrollLeft - strip.scrollLeft) < 0.5) {
      stopFileAutoScroll();
      return;
    }

    strip.scrollLeft = nextScrollLeft;
    updateDragTarget(autoScroll.x, autoScroll.y);
    autoScroll.frame = window.requestAnimationFrame(runFileAutoScroll);
  };

  const updateFileAutoScroll = (clientX: number, clientY: number) => {
    const strip = fileStripRef.current;
    if (!strip) {
      return;
    }

    const rect = strip.getBoundingClientRect();
    const edgeSize = Math.min(96, Math.max(52, rect.width * 0.12));
    const maxSpeed = 1080;
    let velocity = 0;

    if (clientX < rect.left + edgeSize) {
      const intensity = Math.min(
        1,
        Math.max(0, (rect.left + edgeSize - clientX) / edgeSize),
      );
      velocity = -Math.round(intensity * maxSpeed);
    } else if (clientX > rect.right - edgeSize) {
      const intensity = Math.min(
        1,
        Math.max(0, (clientX - (rect.right - edgeSize)) / edgeSize),
      );
      velocity = Math.round(intensity * maxSpeed);
    }

    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    if ((velocity < 0 && strip.scrollLeft <= 0) || (velocity > 0 && strip.scrollLeft >= maxScrollLeft)) {
      velocity = 0;
    }

    const autoScroll = autoScrollRef.current;
    autoScroll.x = clientX;
    autoScroll.y = clientY;
    autoScroll.velocity = velocity;

    if (velocity === 0) {
      stopFileAutoScroll();
      return;
    }

    if (autoScroll.frame === null) {
      autoScroll.frame = window.requestAnimationFrame(runFileAutoScroll);
    }
  };

  const resetPointerDrag = () => {
    stopFileAutoScroll();
    pointerDragRef.current = null;
    onInternalDragActiveChange(false);
    setDraggingFileId(null);
    setDropTarget(null);
    setDragPreview(null);
  };

  const handlePointerDragStart = (
    event: React.PointerEvent<HTMLElement>,
    fileId: string,
  ) => {
    onInternalDragActiveChange(true);
    pointerDragRef.current = {
      fileId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: null,
      active: false,
      hitRects: [],
      scrollLeft: fileStripRef.current?.scrollLeft ?? 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerDragMove = (
    event: React.PointerEvent<HTMLElement>,
    fileId: string,
  ): boolean => {
    const drag = pointerDragRef.current;
    if (!drag || drag.fileId !== fileId || drag.pointerId !== event.pointerId) {
      return false;
    }

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance < 6) {
      return false;
    }

    if (!drag.active) {
      drag.hitRects = captureFileHitRects();
      drag.scrollLeft = fileStripRef.current?.scrollLeft ?? 0;
    }
    drag.active = true;
    event.preventDefault();
    setDraggingFileId(drag.fileId);
    updateDragTarget(event.clientX, event.clientY);
    updateFileAutoScroll(event.clientX, event.clientY);
    return true;
  };

  const handlePointerDragEnd = (
    event: React.PointerEvent<HTMLElement>,
    fileId: string,
  ): boolean => {
    const drag = pointerDragRef.current;
    if (!drag || drag.fileId !== fileId || drag.pointerId !== event.pointerId) {
      return false;
    }

    const wasDragging = drag.active;
    const target = drag.target;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetPointerDrag();

    if (wasDragging && target) {
      const targetIndex = files.findIndex((file) => file.id === target.fileId);
      if (targetIndex >= 0) {
        moveFileToIndex(drag.fileId, targetIndex + (target.position === "after" ? 1 : 0));
      }
    }

    return wasDragging;
  };

  const handlePointerDragCancel = (
    event: React.PointerEvent<HTMLElement>,
    fileId: string,
  ) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.fileId !== fileId || drag.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPointerDrag();
  };

  useEffect(
    () => () => {
      stopFileAutoScroll();
      onInternalDragActiveChange(false);
    },
    [onInternalDragActiveChange],
  );

  const dragPreviewFile = dragPreview
    ? files.find((file) => file.id === dragPreview.fileId)
    : undefined;
  const dragPreviewThumbnail = dragPreviewFile
    ? localAssetSrc(firstThumbnailPath(dragPreviewFile.id))
    : undefined;

  return (
    <section className="workspace-section file-order-section">
      <div className="section-heading">
        <div>
          <h2>ファイル順序</h2>
          <p>{files.length}件、結合順をカード単位で編集中</p>
        </div>
      </div>
      <div
        className={["file-strip", draggingFileId ? "is-pointer-dragging" : ""].join(" ")}
        ref={fileStripRef}
      >
        {files.length === 0 ? (
          <div className="empty-file-strip">
            <Upload size={28} />
            <strong>PDF / Office ファイルを追加してください</strong>
            <span>上部のファイル追加、またはこの画面へのドラッグ&ドロップで開始します。</span>
          </div>
        ) : (
          files.map((file, index) => (
            <FileCard
              file={file}
              index={index}
              fileCount={files.length}
              thumbnailPath={firstThumbnailPath(file.id)}
              outputPageNumbers={outputPageNumbers}
              draggingFileId={draggingFileId}
              dropTarget={dropTarget}
              onPointerDragStart={handlePointerDragStart}
              onPointerDragMove={handlePointerDragMove}
              onPointerDragEnd={handlePointerDragEnd}
              onPointerDragCancel={handlePointerDragCancel}
              onRequestRemoveFiles={onRequestRemoveFiles}
              key={file.id}
            />
          ))
        )}
      </div>
      {dragPreview && dragPreviewFile && (
        <div
          className="file-drag-ghost"
          style={{ left: dragPreview.x + 14, top: dragPreview.y + 14 }}
        >
          <span className={`kind-badge kind-${dragPreviewFile.kind}`}>
            {kindLabel(dragPreviewFile.kind)}
          </span>
          <div className={["ghost-paper", dragPreviewThumbnail ? "has-thumbnail" : ""].join(" ")}>
            {dragPreviewThumbnail ? (
              <img src={dragPreviewThumbnail} alt="" draggable={false} />
            ) : (
              <FileText size={22} />
            )}
          </div>
          <strong>{dragPreviewFile.name}</strong>
        </div>
      )}
    </section>
  );
}

type DecorationCoverage = "none" | "partial" | "full";

function decorationAppliesToPage(decoration: Decoration, page: PageItem): boolean {
  if (decoration.excludedPageIds?.includes(page.id)) {
    return false;
  }
  if (decoration.pageId === page.id) {
    return true;
  }
  if (decoration.target === "file" && decoration.fileId) {
    return decoration.fileId === page.fileId;
  }
  if (decoration.target === "all") {
    return true;
  }
  return decoration.target === "selected" && page.selected && !decoration.pageId;
}

function decorationKindMatches(decoration: Decoration, kind: DecorationKind): boolean {
  if (kind === "footer") {
    return decoration.kind === "footer" || decoration.kind === "page-number";
  }
  return decoration.kind === kind;
}

function decorationMarkLabel(kind: DecorationKind): string {
  switch (kind) {
    case "header":
      return "H";
    case "footer":
    case "page-number":
      return "F";
    case "watermark":
      return "W";
  }
}

function fileDecorationCoverage(
  file: WorkbenchFile,
  pages: PageItem[],
  decorations: Decoration[],
  kind: DecorationKind,
): DecorationCoverage {
  const relevantDecorations = decorations.filter((decoration) =>
    decorationKindMatches(decoration, kind),
  );
  if (relevantDecorations.length === 0) {
    return "none";
  }
  if (pages.length === 0) {
    return relevantDecorations.some(
      (decoration) =>
        decoration.target === "all" ||
        (decoration.target === "file" && decoration.fileId === file.id),
    )
      ? "full"
      : "none";
  }

  const decoratedPageCount = pages.filter((page) =>
    relevantDecorations.some((decoration) => decorationAppliesToPage(decoration, page)),
  ).length;
  if (decoratedPageCount === pages.length) {
    return "full";
  }
  if (decoratedPageCount > 0) {
    return "partial";
  }
  return "none";
}

function fileDecorationStatuses(
  file: WorkbenchFile,
  pages: PageItem[],
  decorations: Decoration[],
) {
  return (["header", "footer", "page-number", "watermark"] as DecorationKind[])
    .map((kind) => ({
      kind,
      label: decorationMarkLabel(kind),
      coverage: fileDecorationCoverage(file, pages, decorations, kind),
      title: `${decorationLabel(kind)} ${
        fileDecorationCoverage(file, pages, decorations, kind) === "full"
          ? "全ページ適用"
          : "一部適用"
      }`,
    }))
    .filter((status) => status.coverage !== "none");
}

function fileWideDecorations(
  file: WorkbenchFile,
  pages: PageItem[],
  decorations: Decoration[],
): Decoration[] {
  const activePages = pages.filter((page) => !page.excluded);
  if (activePages.length === 0) {
    return decorations.filter(
      (decoration) =>
        decoration.target === "all" ||
        (decoration.target === "file" && decoration.fileId === file.id),
    );
  }

  return decorations.filter((decoration) =>
    activePages.every((page) => decorationAppliesToPage(decoration, page)),
  );
}

function decorationTextForPage(decoration: Decoration, page: PageItem): string {
  const outputPage = page as PageItem & {
    outputPageNumber?: number;
    outputPageTotal?: number;
  };
  const pageNumber = outputPage.outputPageNumber ?? page.pageNumber;
  const total = outputPage.outputPageTotal ?? "total";
  return decoration.text
    .replace("{page}", String(pageNumber))
    .replace("{total}", String(total));
}

function watermarkFontSize(text: string): number {
  const length = Math.max(6, text.length);
  return Math.max(10, Math.min(19, Math.floor(150 / length)));
}

type DecorationSlot = "left" | "center" | "right";

function decorationSlot(position: DecorationPosition): DecorationSlot {
  if (position.endsWith("-left")) {
    return "left";
  }
  if (position.endsWith("-right")) {
    return "right";
  }
  return "center";
}

function decorationSlotRows(
  decorations: Decoration[],
  kind: "header" | "footer",
): Record<DecorationSlot, Decoration[]> {
  return decorations.reduce<Record<DecorationSlot, Decoration[]>>(
    (groups, decoration) => {
      const isFooter = decoration.kind === "footer" || decoration.kind === "page-number";
      if ((kind === "header" && decoration.kind !== "header") || (kind === "footer" && !isFooter)) {
        return groups;
      }
      groups[decorationSlot(decoration.position)].push(decoration);
      return groups;
    },
    { left: [], center: [], right: [] },
  );
}

function PageDecorations({
  page,
  decorations,
}: {
  page: PageItem;
  decorations: Decoration[];
}) {
  const visibleDecorations = decorations.filter((decoration) =>
    decorationAppliesToPage(decoration, page),
  );
  const headerSlots = decorationSlotRows(visibleDecorations, "header");
  const footerSlots = decorationSlotRows(visibleDecorations, "footer");
  const watermark = visibleDecorations.find(
    (decoration) => decoration.kind === "watermark",
  );
  const hasHeaderDecorations = (["left", "center", "right"] as DecorationSlot[]).some(
    (slot) => headerSlots[slot].length > 0,
  );
  const hasFooterDecorations = (["left", "center", "right"] as DecorationSlot[]).some(
    (slot) => footerSlots[slot].length > 0,
  );
  const renderSlot = (slot: DecorationSlot, items: Decoration[]) => {
    const primary = items[items.length - 1];
    return (
      <div className={["decor-slot", `slot-${slot}`, primary ? "has-decoration" : ""].join(" ")} key={slot}>
        {primary && (
          <span style={{ color: primary.color }}>{decorationTextForPage(primary, page)}</span>
        )}
      </div>
    );
  };

  return (
    <>
      {hasHeaderDecorations && (
        <div className="decor-row decor-row-header">
          {(["left", "center", "right"] as DecorationSlot[]).map((slot) => renderSlot(slot, headerSlots[slot]))}
        </div>
      )}
      {hasFooterDecorations && (
        <div className="decor-row decor-row-footer">
          {(["left", "center", "right"] as DecorationSlot[]).map((slot) => renderSlot(slot, footerSlots[slot]))}
        </div>
      )}
      {watermark && (
        <div
          className="placed-watermark"
          style={{
            color: watermark.color,
            fontSize: `${watermarkFontSize(watermark.text)}px`,
          }}
        >
          {watermark.text}
        </div>
      )}
    </>
  );
}

function svgTextAnchor(align: DecorationLayoutItem["align"]): "start" | "middle" | "end" {
  if (align === "right") {
    return "end";
  }
  if (align === "center") {
    return "middle";
  }
  return "start";
}

function svgTextX(item: DecorationLayoutItem): number {
  const rect = item.rectPt;
  if (!rect) {
    return item.pointPt?.[0] ?? item.centerPt?.[0] ?? 0;
  }
  if (item.align === "right") {
    return rect[2];
  }
  if (item.align === "center") {
    return (rect[0] + rect[2]) / 2;
  }
  return rect[0];
}

function svgFontFamily(item: DecorationLayoutItem, manifest: DecorationLayoutManifest): string {
  const primary = item.fontFamily ?? manifest.fontFamily ?? "BIZ UDPGothic";
  return `${primary}, "Yu Gothic", "Yu Gothic UI", Meiryo, sans-serif`;
}

function safeSvgId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function DecorationManifestSvg({
  manifest,
  idPrefix,
}: {
  manifest: DecorationLayoutManifest;
  idPrefix: string;
}) {
  if (manifest.items.length === 0 || manifest.pageWidthPt <= 0 || manifest.pageHeightPt <= 0) {
    return null;
  }

  const clipPrefix = safeSvgId(`${idPrefix}-${manifest.cacheKey}`);
  return (
    <svg
      className="preview-decoration-overlay-svg"
      viewBox={`0 0 ${manifest.pageWidthPt} ${manifest.pageHeightPt}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {manifest.items.map((item, index) => {
          if (!item.rectPt) {
            return null;
          }
          const [x0, y0, x1, y1] = item.rectPt;
          return (
            <clipPath id={`${clipPrefix}-clip-${index}`} key={index}>
              <rect x={x0} y={y0} width={Math.max(0, x1 - x0)} height={Math.max(0, y1 - y0)} />
            </clipPath>
          );
        })}
      </defs>
      {manifest.items.map((item, index) => {
        const fontSize = item.fontSizePt;
        const textLength = item.textWidthPt && item.textWidthPt > 0 ? item.textWidthPt : undefined;
        if (item.kind === "watermark") {
          const center = item.centerPt;
          if (!center) {
            return null;
          }
          return (
            <text
              className="preview-decoration-svg-text"
              key={`${item.sourceDecorationId ?? item.kind}-${index}`}
              x={center[0]}
              y={center[1]}
              fill={item.color}
              fontFamily={svgFontFamily(item, manifest)}
              fontSize={fontSize}
              opacity={item.opacity ?? 1}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${item.rotationDeg ?? -25} ${center[0]} ${center[1]})`}
              textLength={textLength}
              lengthAdjust={textLength ? "spacingAndGlyphs" : undefined}
            >
              {item.text}
            </text>
          );
        }

        const rect = item.rectPt;
        if (!rect) {
          return null;
        }
        const [, y0] = rect;
        return (
          <text
            className="preview-decoration-svg-text"
            clipPath={`url(#${clipPrefix}-clip-${index})`}
            key={`${item.sourceDecorationId ?? item.kind}-${index}`}
            x={svgTextX(item)}
            y={item.baselinePt ?? y0 + fontSize}
            fill={item.color}
            fontFamily={svgFontFamily(item, manifest)}
            fontSize={fontSize}
            textAnchor={svgTextAnchor(item.align)}
            dominantBaseline="alphabetic"
            textLength={textLength}
            lengthAdjust={textLength ? "spacingAndGlyphs" : undefined}
          >
            {item.text}
          </text>
        );
      })}
    </svg>
  );
}

function DecorationPreviewLayer({
  manifest,
  overlaySrc,
  idPrefix,
}: {
  manifest?: DecorationLayoutManifest;
  overlaySrc?: string;
  idPrefix: string;
}) {
  if (overlaySrc) {
    return (
      <img
        className="preview-decoration-overlay-raster"
        src={overlaySrc}
        alt=""
        draggable={false}
      />
    );
  }
  if (manifest) {
    return <DecorationManifestSvg manifest={manifest} idPrefix={idPrefix} />;
  }
  return null;
}

type PreviewFilmstripItemProps = {
  page: ExportPreviewFilmstripPage;
  pageKey: string;
  index: number;
  active: boolean;
  aspectRatio?: number;
  thumbnailPath?: string;
  decorationPreview?: DecorationPreviewState;
  onSelect: (index: number) => void;
  onImageLoad: (pageKey: string, event: SyntheticEvent<HTMLImageElement>) => void;
  setThumbnailRef: (pageKey: string, node: HTMLButtonElement | null) => void;
};

const PreviewFilmstripItem = memo(function PreviewFilmstripItem({
  page,
  pageKey,
  index,
  active,
  aspectRatio,
  thumbnailPath,
  decorationPreview,
  onSelect,
  onImageLoad,
  setThumbnailRef,
}: PreviewFilmstripItemProps) {
  const decorationManifest = decorationPreview?.manifest ?? decorationPreview?.overlay;
  const decorationOverlaySrc = localAssetSrc(decorationPreview?.overlay?.overlayPath ?? undefined);
  const thumbnailSrc = localAssetSrc(thumbnailPath);
  const manifestAspectRatio =
    decorationManifest?.pageWidthPt && decorationManifest.pageHeightPt
      ? decorationManifest.pageWidthPt / decorationManifest.pageHeightPt
      : undefined;
  const paperAspectRatio = manifestAspectRatio ?? aspectRatio;

  return (
    <div className="filmstrip-item-wrap">
      {page.startsOutput && (
        <div className="filmstrip-split-marker">
          <Scissors size={14} />
          <span>{page.outputName}</span>
        </div>
      )}
      <button
        ref={(node) => {
          setThumbnailRef(pageKey, node);
        }}
        className={["filmstrip-thumb", active ? "is-active" : ""].join(" ")}
        onClick={() => onSelect(index)}
        type="button"
        title={`${page.outputName} / ${page.fileName} p${page.pageNumber}`}
      >
        <div
          className={["filmstrip-paper", thumbnailSrc ? "has-thumbnail" : ""].join(" ")}
          style={paperAspectRatio ? { aspectRatio: String(paperAspectRatio) } : undefined}
        >
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt=""
              draggable={false}
              onLoad={(event) => onImageLoad(pageKey, event)}
            />
          ) : (
            <FileText size={20} />
          )}
          <DecorationPreviewLayer
            manifest={decorationManifest}
            overlaySrc={decorationOverlaySrc}
            idPrefix={`filmstrip-${pageKey}`}
          />
        </div>
        <span>{kindLabel(page.fileKind)} p{page.outputPageNumber}</span>
      </button>
    </div>
  );
});

function PageCard({
  page,
  fileId,
  decorations,
  draggingPageId,
  dropTarget,
  onDragOver,
  onDrop,
  onPointerDragStart,
  onPointerDragMove,
  onPointerDragEnd,
  onPointerDragCancel,
  onMouseDragStart,
  onMouseDragMove,
  onMouseDragEnd,
  onRequestToggleExcluded,
}: {
  page: PageItem;
  fileId: string;
  decorations: Decoration[];
  draggingPageId: string | null;
  dropTarget: PageDropTarget | null;
  onDragOver: (event: DragEvent<HTMLButtonElement>, pageId: string) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>, pageId: string) => void;
  onPointerDragStart: (event: React.PointerEvent<HTMLButtonElement>, pageId: string) => void;
  onPointerDragMove: (event: React.PointerEvent<HTMLButtonElement>, pageId: string) => boolean;
  onPointerDragEnd: (event: React.PointerEvent<HTMLButtonElement>, pageId: string) => boolean;
  onPointerDragCancel: (event: React.PointerEvent<HTMLButtonElement>, pageId: string) => void;
  onMouseDragStart: (event: React.MouseEvent<HTMLButtonElement>, pageId: string) => void;
  onMouseDragMove: (event: React.MouseEvent<HTMLButtonElement>, pageId: string) => boolean;
  onMouseDragEnd: (event: React.MouseEvent<HTMLButtonElement>, pageId: string) => boolean;
  onRequestToggleExcluded: (page: PageItem) => void;
}) {
  const activeTool = useWorkbenchStore((state) => state.activeTool);
  const selectPage = useWorkbenchStore((state) => state.selectPage);
  const togglePageSplit = useWorkbenchStore((state) => state.togglePageSplit);
  const applyDecorationToTarget = useWorkbenchStore(
    (state) => state.applyDecorationToTarget,
  );
  const activeDecorationKind = decorationToolIds.includes(activeTool as DecorationKind)
    ? (activeTool as DecorationKind)
    : undefined;
  const clickGuardRef = useRef(false);

  const applyTool = (event?: React.MouseEvent) => {
    if (clickGuardRef.current) {
      return;
    }
    if (activeTool === "trash") {
      onRequestToggleExcluded(page);
      return;
    }
    if (activeTool === "scissors") {
      togglePageSplit(page.id);
      return;
    }
    if (decorationToolIds.includes(activeTool as DecorationKind)) {
      applyDecorationToTarget(activeTool as DecorationKind, { pageId: page.id });
      return;
    }
    selectPage(
      page.id,
      event?.shiftKey
        ? "range"
        : event?.ctrlKey || event?.metaKey
          ? "toggle"
          : "replace",
    );
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (activeTool !== "select" || (event.button !== 0 && event.buttons !== 1)) {
      return;
    }
    onPointerDragStart(event, page.id);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (onPointerDragMove(event, page.id)) {
      clickGuardRef.current = true;
    }
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (onPointerDragEnd(event, page.id)) {
      clickGuardRef.current = true;
      window.setTimeout(() => {
        clickGuardRef.current = false;
      }, 0);
    }
  };
  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerDragCancel(event, page.id);
  };
  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeTool !== "select" || event.button !== 0) {
      return;
    }
    onMouseDragStart(event, page.id);
  };
  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onMouseDragMove(event, page.id)) {
      clickGuardRef.current = true;
    }
  };
  const handleMouseUp = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onMouseDragEnd(event, page.id)) {
      clickGuardRef.current = true;
      window.setTimeout(() => {
        clickGuardRef.current = false;
      }, 0);
    }
  };

  return (
    <button
      className={[
        "page-card",
        page.excluded ? "is-excluded" : "",
        page.selected ? "is-selected" : "",
        draggingPageId === page.id ? "is-dragging" : "",
        dropTarget?.pageId === page.id ? `is-drop-${dropTarget.position}` : "",
        activeDecorationKind ? "is-decoration-target" : "",
        activeDecorationKind ? `decoration-${activeDecorationKind}` : "",
      ].join(" ")}
      onClick={applyTool}
      onDragOver={(event) => onDragOver(event, page.id)}
      onDrop={(event) => onDrop(event, page.id)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      type="button"
      data-file-id={fileId}
      data-page-id={page.id}
      draggable={false}
    >
      <div className={["page-sheet", page.thumbnailPath ? "has-thumbnail" : ""].join(" ")}>
        {page.thumbnailPath && (
          <img
            className="page-thumbnail"
            src={localAssetSrc(page.thumbnailPath)}
            alt=""
            draggable={false}
          />
        )}
        <div className="page-lines">
          <span />
          <span />
          <span />
          <span />
        </div>
        <PageDecorations page={page} decorations={decorations} />
      </div>
      <div className="page-label">
        p{page.pageNumber}
      </div>
      {page.splitAfter && (
        <div className="split-marker" title="このページの後で分割">
          <Scissors size={18} />
        </div>
      )}
    </button>
  );
}

function DecorationPanel({
  kind,
  panelPosition,
  onPanelPositionChange,
  onClose,
}: {
  kind: DecorationKind;
  panelPosition: PanelPosition | null;
  onPanelPositionChange: (position: PanelPosition) => void;
  onClose: () => void;
}) {
  const draft = useWorkbenchStore((state) => state.decorationDrafts[kind]);
  const updateDecorationDraft = useWorkbenchStore(
    (state) => state.updateDecorationDraft,
  );
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelDragRef = useRef<{
    parentRect: DOMRect;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const Icon =
    kind === "header"
      ? Type
      : kind === "footer"
        ? Highlighter
        : kind === "page-number"
          ? Hash
          : Stamp;
  const isWatermark = kind === "watermark";
  const positionOptions: Array<{ label: string; value: DecorationPosition; icon: typeof AlignLeft }> =
    kind === "header"
      ? [
          { label: "左", value: "top-left", icon: AlignLeft },
          { label: "中央", value: "top", icon: AlignCenter },
          { label: "右", value: "top-right", icon: AlignRight },
        ]
      : [
          { label: "左", value: "bottom-left", icon: AlignLeft },
          { label: "中央", value: "bottom", icon: AlignCenter },
          { label: "右", value: "bottom-right", icon: AlignRight },
        ];
  const setPosition = (position: DecorationPosition) => {
    updateDecorationDraft(kind, { position });
  };
  const addToken = (token: string) => {
    const input = textInputRef.current;
    const start = input?.selectionStart ?? draft.text.length;
    const end = input?.selectionEnd ?? start;
    const nextText = `${draft.text.slice(0, start)}${token}${draft.text.slice(end)}`;
    const nextCaret = start + token.length;
    updateDecorationDraft(kind, { text: nextText });
    window.requestAnimationFrame(() => {
      textInputRef.current?.focus();
      textInputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };
  const keepTextInputActive = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const clampPanelPosition = (
    position: PanelPosition,
    parentRect: DOMRect,
    width: number,
    height: number,
  ): PanelPosition => {
    const padding = 8;
    const maxLeft = Math.max(padding, parentRect.width - width - padding);
    const maxTop = Math.max(padding, parentRect.height - height - padding);
    return {
      left: Math.max(padding, Math.min(maxLeft, position.left)),
      top: Math.max(padding, Math.min(maxTop, position.top)),
    };
  };
  useEffect(() => {
    if (!panelPosition) {
      return undefined;
    }
    const panel = panelRef.current;
    const parent = panel?.offsetParent as HTMLElement | null;
    if (!panel || !parent) {
      return undefined;
    }

    const keepPanelInBounds = () => {
      const panelRect = panel.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const nextPosition = clampPanelPosition(
        panelPosition,
        parentRect,
        panelRect.width,
        panelRect.height,
      );
      if (
        Math.abs(nextPosition.left - panelPosition.left) >= 1 ||
        Math.abs(nextPosition.top - panelPosition.top) >= 1
      ) {
        onPanelPositionChange(nextPosition);
      }
    };

    keepPanelInBounds();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", keepPanelInBounds);
      return () => window.removeEventListener("resize", keepPanelInBounds);
    }

    const observer = new ResizeObserver(keepPanelInBounds);
    observer.observe(parent);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panelPosition, onPanelPositionChange]);
  const startPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    const panel = panelRef.current;
    const parent = panel?.offsetParent as HTMLElement | null;
    if (!panel || !parent) {
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    panelDragRef.current = {
      parentRect,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
      width: panelRect.width,
      height: panelRect.height,
    };
    onPanelPositionChange({
      left: panelRect.left - parentRect.left,
      top: panelRect.top - parentRect.top,
    });
    setIsDraggingPanel(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const movePanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = panelDragRef.current;
    if (!drag) {
      return;
    }
    onPanelPositionChange(
      clampPanelPosition(
        {
          left: event.clientX - drag.parentRect.left - drag.offsetX,
          top: event.clientY - drag.parentRect.top - drag.offsetY,
        },
        drag.parentRect,
        drag.width,
        drag.height,
      ),
    );
  };
  const endPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panelDragRef.current = null;
    setIsDraggingPanel(false);
  };

  return (
    <div
      className={["floating-panel decoration-panel", isDraggingPanel ? "is-dragging" : ""].join(" ")}
      ref={panelRef}
      role="group"
      aria-label={`${decorationLabel(kind)}設定`}
      style={
        panelPosition
          ? {
              left: panelPosition.left,
              top: panelPosition.top,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
    >
      <div
        className="floating-title panel-drag-handle"
        onPointerDown={startPanelDrag}
        onPointerMove={movePanelDrag}
        onPointerUp={endPanelDrag}
        onPointerCancel={endPanelDrag}
        title="ドラッグで移動"
      >
        <span>
          <GripHorizontal size={15} />
          <Icon size={16} />
          {decorationLabel(kind)}
        </span>
        <small>ドラッグで移動</small>
        <button className="panel-close" onClick={onClose} aria-label="設定を隠す" type="button">
          <X size={14} />
        </button>
      </div>
      <label>
        文字
        <input
          ref={textInputRef}
          value={draft.text}
          onChange={(event) => updateDecorationDraft(kind, { text: event.target.value })}
        />
      </label>
      {!isWatermark && (
        <>
          <div className="floating-controls" aria-label="配置">
            {positionOptions.map((option) => {
              const PositionIcon = option.icon;
              return (
                <button
                  className={draft.position === option.value ? "is-active" : ""}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => setPosition(option.value)}
                  onMouseDown={keepTextInputActive}
                  type="button"
                  key={option.value}
                >
                  <PositionIcon size={15} />
                </button>
              );
            })}
          </div>
          <div className="token-controls">
            <button onClick={() => addToken("{page}")} onMouseDown={keepTextInputActive} type="button">
              page
            </button>
            <button onClick={() => addToken("{total}")} onMouseDown={keepTextInputActive} type="button">
              total
            </button>
          </div>
        </>
      )}
      {isWatermark && (
        <div className="color-controls" aria-label="色">
          {[
            { label: "赤", value: "#d56a6a" },
            { label: "灰", value: "#8d98a8" },
          ].map((option) => (
            <button
              className={draft.color.toLowerCase() === option.value ? "is-active" : ""}
              onClick={() => updateDecorationDraft(kind, { color: option.value })}
              type="button"
              key={option.value}
            >
              <span style={{ background: option.value }} />
              {option.label}
            </button>
          ))}
          <input
            type="color"
            value={draft.color}
            onChange={(event) => updateDecorationDraft(kind, { color: event.target.value })}
            aria-label="透かし色"
          />
        </div>
      )}
    </div>
  );
}

function SecurityPanel({ onClose }: { onClose: () => void }) {
  const security = useWorkbenchStore((state) => state.security);
  const updateSecurity = useWorkbenchStore((state) => state.updateSecurity);
  const outputEncryptionEnabled = security.outputEncrypted;

  return (
    <div className="floating-panel tool-panel">
      <button className="panel-close panel-close-floating" onClick={onClose} aria-label="設定を隠す">
        <X size={14} />
      </button>
      <div className="floating-title">
        <Shield size={16} />
        暗号化
      </div>
      <p className="security-panel-note">
        書き出しPDFの保護と、保護された入力PDFを開くための設定です。
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={security.outputEncrypted}
          onChange={(event) => updateSecurity({ outputEncrypted: event.target.checked })}
        />
        書き出すPDFを保護
      </label>
      <label className={!outputEncryptionEnabled ? "is-disabled-field" : ""}>
        <span className="field-title">開くパスワード</span>
        <small className="field-help">書き出したPDFを開くときに要求します。</small>
        <input
          type="password"
          value={security.outputPassword ?? ""}
          onChange={(event) => updateSecurity({ outputPassword: event.target.value })}
          placeholder={outputEncryptionEnabled ? "パスワードを入力" : "保護OFF"}
          disabled={!outputEncryptionEnabled}
        />
      </label>
      <label>
        <span className="field-title">入力PDFの解除パスワード</span>
        <small className="field-help">元PDFが保護されている場合だけ使用します。</small>
        <input
          type="password"
          value={security.inputPassword ?? ""}
          onChange={(event) => updateSecurity({ inputPassword: event.target.value })}
          placeholder="必要時のみ"
        />
      </label>
    </div>
  );
}

function InfoPanel({ file, onClose }: { file?: WorkbenchFile; onClose: () => void }) {
  if (!file) {
    return null;
  }

  return (
    <div className="floating-panel tool-panel">
      <button className="panel-close panel-close-floating" onClick={onClose} aria-label="設定を隠す">
        <X size={14} />
      </button>
      <div className="floating-title">
        <Eye size={16} />
        情報
      </div>
      <div className="info-grid">
        <span>ファイル</span>
        <strong>{file.name}</strong>
        <span>ページ</span>
        <strong>{file.pageCount}</strong>
        <span>サイズ</span>
        <strong>{formatSize(file.sizeBytes)}</strong>
        <span>暗号化</span>
        <strong>{file.metadata?.encrypted ? "あり" : "なし"}</strong>
        <span>用紙</span>
        <strong>{file.metadata?.pageSizeLabel ?? "未取得"}</strong>
      </div>
    </div>
  );
}

function ExpandedTimeline({
  onInternalDragActiveChange = () => undefined,
}: {
  onInternalDragActiveChange?: InternalDragActiveHandler;
}) {
  const files = useWorkbenchStore((state) => state.files);
  const pagesByFile = useWorkbenchStore((state) => state.pagesByFile);
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const decorations = useWorkbenchStore((state) => state.decorations);
  const activeTool = useWorkbenchStore((state) => state.activeTool);
  const toolActivationId = useWorkbenchStore((state) => state.toolActivationId);
  const movePageToIndex = useWorkbenchStore((state) => state.movePageToIndex);
  const togglePageExcluded = useWorkbenchStore((state) => state.togglePageExcluded);
  const togglePageSplit = useWorkbenchStore((state) => state.togglePageSplit);
  const applyDecorationToTarget = useWorkbenchStore(
    (state) => state.applyDecorationToTarget,
  );
  const expandedFile = files.find((file) => file.expanded && file.cacheState === "ready");
  const pages = expandedFile ? pagesByFile[expandedFile.id] ?? [] : [];
  const outputPageNumbers = useMemo(
    () => buildOutputPageNumberMap(files, pagesByFile, outputPlan),
    [files, pagesByFile, outputPlan],
  );
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PageDropTarget | null>(null);
  const [settingsPanelHidden, setSettingsPanelHidden] = useState(false);
  const [decorationPanelPosition, setDecorationPanelPosition] =
    useState<PanelPosition | null>(null);
  const [timelineViewportHeight, setTimelineViewportHeight] = useState(0);
  const [timelineScrollTop, setTimelineScrollTop] = useState(0);
  const pagePointerDragRef = useRef<PagePointerDragRef | null>(null);
  const pageAutoScrollRef = useRef<PageAutoScrollRef>({
    frame: null,
    velocityX: 0,
    velocityY: 0,
    x: 0,
    y: 0,
    lastTime: null,
  });
  const pagePointerWindowHandlersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
    cancel: (event: PointerEvent) => void;
  } | null>(null);
  const pageMouseWindowHandlersRef = useRef<{
    move: (event: MouseEvent) => void;
    up: (event: MouseEvent) => void;
  } | null>(null);
  const pageTimelineRef = useRef<HTMLDivElement | null>(null);

  const totalTimelineRows = Math.ceil(pages.length / pageTimelineColumnCount);
  const firstVisibleRow = Math.max(
    0,
    Math.floor(timelineScrollTop / pageTimelineRowHeight) - pageTimelineOverscanRows,
  );
  const visibleRowCount =
    Math.ceil((timelineViewportHeight || pageTimelineRowHeight) / pageTimelineRowHeight) +
    pageTimelineOverscanRows * 2;
  const lastVisibleRow = Math.min(totalTimelineRows, firstVisibleRow + visibleRowCount);
  const visiblePageStart = firstVisibleRow * pageTimelineColumnCount;
  const visiblePageEnd = Math.min(pages.length, lastVisibleRow * pageTimelineColumnCount);
  const visiblePages = pages.slice(visiblePageStart, visiblePageEnd);
  const topSpacerHeight = firstVisibleRow * pageTimelineRowHeight;
  const bottomSpacerHeight = Math.max(0, totalTimelineRows - lastVisibleRow) * pageTimelineRowHeight;

  useEffect(() => {
    setSettingsPanelHidden(false);
  }, [activeTool, expandedFile?.id, toolActivationId]);

  useEffect(() => {
    const timeline = pageTimelineRef.current;
    if (!timeline) {
      return undefined;
    }

    const updateViewport = () => {
      setTimelineViewportHeight(timeline.clientHeight);
      setTimelineScrollTop(timeline.scrollTop);
    };
    updateViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewport);
      return () => window.removeEventListener("resize", updateViewport);
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(timeline);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timeline = pageTimelineRef.current;
    if (timeline) {
      timeline.scrollTop = 0;
    }
    setTimelineScrollTop(0);
  }, [expandedFile?.id]);

  const positionFromEvent = (
    event: DragEvent<HTMLButtonElement>,
  ): PageDropTarget["position"] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX > rect.left + rect.width / 2 ? "after" : "before";
  };

  const capturePageHitRects = (): DragHitRect[] =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-page-id]"))
      .map((card) => {
        const rect = card.getBoundingClientRect();
        const id = card.dataset.pageId;
        if (!id) {
          return null;
        }
        return {
          id,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
      })
      .filter((rect): rect is DragHitRect => Boolean(rect));

  const pageDropTargetFromPoint = (clientX: number, clientY: number): PageDropTarget | null => {
    const drag = pagePointerDragRef.current;
    const hitRects = drag?.hitRects ?? [];
    if (hitRects.length === 0) {
      return null;
    }

    const scrollContainer = pageTimelineRef.current;
    const scrollDeltaX =
      (scrollContainer?.scrollLeft ?? drag?.scrollLeft ?? 0) - (drag?.scrollLeft ?? 0);
    const scrollDeltaY =
      (scrollContainer?.scrollTop ?? drag?.scrollTop ?? 0) - (drag?.scrollTop ?? 0);
    const adjustedRects = hitRects.map((rect) => ({
      ...rect,
      left: rect.left - scrollDeltaX,
      right: rect.right - scrollDeltaX,
      top: rect.top - scrollDeltaY,
      bottom: rect.bottom - scrollDeltaY,
      centerX: rect.centerX - scrollDeltaX,
      centerY: rect.centerY - scrollDeltaY,
    }));
    const hitRect = adjustedRects.find(
      (rect) =>
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom,
    );
    const targetRect =
      hitRect ??
      adjustedRects.reduce<DragHitRect | null>((closest, rect) => {
        if (!closest) {
          return rect;
        }
        const distance = Math.hypot(clientX - rect.centerX, clientY - rect.centerY);
        const closestDistance = Math.hypot(
          clientX - closest.centerX,
          clientY - closest.centerY,
        );
        return distance < closestDistance ? rect : closest;
      }, null);

    if (!targetRect) {
      return null;
    }

    return {
      pageId: targetRect.id,
      position: clientX > targetRect.centerX ? "after" : "before",
    };
  };

  const removePagePointerWindowHandlers = () => {
    const handlers = pagePointerWindowHandlersRef.current;
    if (!handlers) {
      return;
    }
    window.removeEventListener("pointermove", handlers.move);
    window.removeEventListener("pointerup", handlers.up);
    window.removeEventListener("pointercancel", handlers.cancel);
    pagePointerWindowHandlersRef.current = null;
  };

  const removePageMouseWindowHandlers = () => {
    const handlers = pageMouseWindowHandlersRef.current;
    if (!handlers) {
      return;
    }
    window.removeEventListener("mousemove", handlers.move);
    window.removeEventListener("mouseup", handlers.up);
    pageMouseWindowHandlersRef.current = null;
  };

  const stopPageAutoScroll = () => {
    const autoScroll = pageAutoScrollRef.current;
    if (autoScroll.frame !== null) {
      window.cancelAnimationFrame(autoScroll.frame);
    }
    autoScroll.frame = null;
    autoScroll.velocityX = 0;
    autoScroll.velocityY = 0;
    autoScroll.lastTime = null;
  };

  const refreshPageHitRects = () => {
    const drag = pagePointerDragRef.current;
    const timeline = pageTimelineRef.current;
    if (!drag || !timeline) {
      return;
    }
    const hitRects = capturePageHitRects();
    if (hitRects.length === 0) {
      return;
    }
    drag.hitRects = hitRects;
    drag.scrollLeft = timeline.scrollLeft;
    drag.scrollTop = timeline.scrollTop;
  };

  const updatePageDragTarget = (clientX: number, clientY: number) => {
    const drag = pagePointerDragRef.current;
    if (!drag?.active) {
      return;
    }
    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    refreshPageHitRects();
    const nextTarget = pageDropTargetFromPoint(clientX, clientY);
    drag.target = nextTarget;
    setDraggingPageId(drag.pageId);
    setDropTarget(nextTarget);
  };

  const runPageAutoScroll = (timestamp: number) => {
    const autoScroll = pageAutoScrollRef.current;
    const timeline = pageTimelineRef.current;
    const drag = pagePointerDragRef.current;
    if (
      !timeline ||
      !drag?.active ||
      (autoScroll.velocityX === 0 && autoScroll.velocityY === 0)
    ) {
      stopPageAutoScroll();
      return;
    }

    refreshPageHitRects();
    const elapsedMs =
      autoScroll.lastTime === null ? 16.7 : timestamp - autoScroll.lastTime;
    autoScroll.lastTime = timestamp;
    const deltaSeconds = Math.min(0.05, Math.max(0.001, elapsedMs / 1000));
    const maxScrollLeft = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
    const maxScrollTop = Math.max(0, timeline.scrollHeight - timeline.clientHeight);
    const nextScrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, timeline.scrollLeft + autoScroll.velocityX * deltaSeconds),
    );
    const nextScrollTop = Math.max(
      0,
      Math.min(maxScrollTop, timeline.scrollTop + autoScroll.velocityY * deltaSeconds),
    );
    const leftChanged = Math.abs(nextScrollLeft - timeline.scrollLeft) >= 0.5;
    const topChanged = Math.abs(nextScrollTop - timeline.scrollTop) >= 0.5;

    if (!leftChanged && !topChanged) {
      stopPageAutoScroll();
      return;
    }

    timeline.scrollLeft = nextScrollLeft;
    timeline.scrollTop = nextScrollTop;
    setTimelineScrollTop(nextScrollTop);
    const nextTarget = pageDropTargetFromPoint(autoScroll.x, autoScroll.y);
    drag.target = nextTarget;
    setDraggingPageId(drag.pageId);
    setDropTarget(nextTarget);
    autoScroll.frame = window.requestAnimationFrame(runPageAutoScroll);
  };

  const updatePageAutoScroll = (clientX: number, clientY: number) => {
    const timeline = pageTimelineRef.current;
    const drag = pagePointerDragRef.current;
    if (!timeline || !drag?.active) {
      return;
    }

    const rect = timeline.getBoundingClientRect();
    const verticalEdge = Math.min(76, Math.max(44, rect.height * 0.18));
    const horizontalEdge = Math.min(72, Math.max(44, rect.width * 0.08));
    const maxVerticalSpeed = 940;
    const maxHorizontalSpeed = 620;
    let velocityX = 0;
    let velocityY = 0;

    if (clientY < rect.top + verticalEdge) {
      const intensity = Math.min(
        1,
        Math.max(0, (rect.top + verticalEdge - clientY) / verticalEdge),
      );
      velocityY = -Math.round(intensity * maxVerticalSpeed);
    } else if (clientY > rect.bottom - verticalEdge) {
      const intensity = Math.min(
        1,
        Math.max(0, (clientY - (rect.bottom - verticalEdge)) / verticalEdge),
      );
      velocityY = Math.round(intensity * maxVerticalSpeed);
    }

    if (clientX < rect.left + horizontalEdge) {
      const intensity = Math.min(
        1,
        Math.max(0, (rect.left + horizontalEdge - clientX) / horizontalEdge),
      );
      velocityX = -Math.round(intensity * maxHorizontalSpeed);
    } else if (clientX > rect.right - horizontalEdge) {
      const intensity = Math.min(
        1,
        Math.max(0, (clientX - (rect.right - horizontalEdge)) / horizontalEdge),
      );
      velocityX = Math.round(intensity * maxHorizontalSpeed);
    }

    const maxScrollLeft = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
    const maxScrollTop = Math.max(0, timeline.scrollHeight - timeline.clientHeight);
    if ((velocityX < 0 && timeline.scrollLeft <= 0) || (velocityX > 0 && timeline.scrollLeft >= maxScrollLeft)) {
      velocityX = 0;
    }
    if ((velocityY < 0 && timeline.scrollTop <= 0) || (velocityY > 0 && timeline.scrollTop >= maxScrollTop)) {
      velocityY = 0;
    }

    const autoScroll = pageAutoScrollRef.current;
    autoScroll.x = clientX;
    autoScroll.y = clientY;
    autoScroll.velocityX = velocityX;
    autoScroll.velocityY = velocityY;

    if (velocityX === 0 && velocityY === 0) {
      stopPageAutoScroll();
      return;
    }

    if (autoScroll.frame === null) {
      autoScroll.frame = window.requestAnimationFrame(runPageAutoScroll);
    }
  };

  const updatePagePointerDrag = (
    pointerId: number,
    clientX: number,
    clientY: number,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pointerId !== pointerId) {
      return false;
    }

    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    const distance = Math.hypot(clientX - drag.startX, clientY - drag.startY);
    if (!drag.active && distance < 6) {
      return false;
    }

    if (!drag.active) {
      refreshPageHitRects();
    }
    drag.active = true;
    updatePageDragTarget(clientX, clientY);
    updatePageAutoScroll(clientX, clientY);
    return true;
  };

  const completePagePointerDrag = (pointerId: number): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pointerId !== pointerId) {
      return false;
    }

    const wasDragging = drag.active;
    const target = drag.target;
    resetPagePointerDrag();

    if (wasDragging && target && expandedFile) {
      const targetIndex = pages.findIndex((page) => page.id === target.pageId);
      if (targetIndex >= 0) {
        movePageToIndex(
          drag.pageId,
          expandedFile.id,
          targetIndex + (target.position === "after" ? 1 : 0),
        );
      }
    }

    return wasDragging;
  };

  const attachPagePointerWindowHandlers = () => {
    removePagePointerWindowHandlers();
    const move = (event: PointerEvent) => {
      const drag = pagePointerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      if (updatePagePointerDrag(event.pointerId, event.clientX, event.clientY)) {
        event.preventDefault();
      }
    };
    const up = (event: PointerEvent) => {
      const drag = pagePointerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      if (completePagePointerDrag(event.pointerId)) {
        event.preventDefault();
      }
    };
    const cancel = (event: PointerEvent) => {
      const drag = pagePointerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      resetPagePointerDrag();
    };
    pagePointerWindowHandlersRef.current = { move, up, cancel };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    window.addEventListener("pointercancel", cancel);
  };

  const attachPageMouseWindowHandlers = () => {
    removePageMouseWindowHandlers();
    const move = (event: MouseEvent) => {
      const drag = pagePointerDragRef.current;
      if (!drag || drag.pointerId !== pageMouseDragPointerId) {
        return;
      }
      if (updatePagePointerDrag(pageMouseDragPointerId, event.clientX, event.clientY)) {
        event.preventDefault();
      }
    };
    const up = (event: MouseEvent) => {
      const drag = pagePointerDragRef.current;
      if (!drag || drag.pointerId !== pageMouseDragPointerId) {
        return;
      }
      if (completePagePointerDrag(pageMouseDragPointerId)) {
        event.preventDefault();
      }
    };
    pageMouseWindowHandlersRef.current = { move, up };
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", up, { passive: false });
  };

  const resetPagePointerDrag = () => {
    stopPageAutoScroll();
    removePagePointerWindowHandlers();
    removePageMouseWindowHandlers();
    const drag = pagePointerDragRef.current;
    if (
      drag &&
      drag.pointerId !== pageMouseDragPointerId &&
      drag.sourceElement?.hasPointerCapture(drag.pointerId)
    ) {
      drag.sourceElement.releasePointerCapture(drag.pointerId);
    }
    pagePointerDragRef.current = null;
    onInternalDragActiveChange(false);
    setDraggingPageId(null);
    setDropTarget(null);
  };

  const handlePagePointerDragStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ) => {
    onInternalDragActiveChange(true);
    pagePointerDragRef.current = {
      pageId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      target: null,
      active: false,
      hitRects: [],
      scrollLeft: pageTimelineRef.current?.scrollLeft ?? 0,
      scrollTop: pageTimelineRef.current?.scrollTop ?? 0,
      sourceElement: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    attachPagePointerWindowHandlers();
  };

  const handlePagePointerDragMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== event.pointerId) {
      return false;
    }

    const wasUpdated = updatePagePointerDrag(event.pointerId, event.clientX, event.clientY);
    if (wasUpdated) {
      event.preventDefault();
    }
    return wasUpdated;
  };

  const handlePagePointerDragEnd = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== event.pointerId) {
      return false;
    }

    return completePagePointerDrag(event.pointerId);
  };

  const handlePagePointerDragCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ) => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPagePointerDrag();
  };

  const handlePageMouseDragStart = (
    event: React.MouseEvent<HTMLButtonElement>,
    pageId: string,
  ) => {
    if (pagePointerDragRef.current) {
      return;
    }
    onInternalDragActiveChange(true);
    pagePointerDragRef.current = {
      pageId,
      pointerId: pageMouseDragPointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      target: null,
      active: false,
      hitRects: [],
      scrollLeft: pageTimelineRef.current?.scrollLeft ?? 0,
      scrollTop: pageTimelineRef.current?.scrollTop ?? 0,
      sourceElement: event.currentTarget,
    };
    attachPageMouseWindowHandlers();
  };

  const handlePageMouseDragMove = (
    event: React.MouseEvent<HTMLButtonElement>,
    pageId: string,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== pageMouseDragPointerId) {
      return false;
    }

    const wasUpdated = updatePagePointerDrag(pageMouseDragPointerId, event.clientX, event.clientY);
    if (wasUpdated) {
      event.preventDefault();
    }
    return wasUpdated;
  };

  const handlePageMouseDragEnd = (
    event: React.MouseEvent<HTMLButtonElement>,
    pageId: string,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== pageMouseDragPointerId) {
      return false;
    }

    return completePagePointerDrag(pageMouseDragPointerId);
  };

  const handlePageDragOver = (event: DragEvent<HTMLButtonElement>, pageId: string) => {
    const hasTool = Array.from(event.dataTransfer.types).includes(
      "application/pdf-workbench-tool",
    );
    if (!hasTool) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropTarget({ pageId, position: positionFromEvent(event) });
  };

  useEffect(
    () => () => {
      stopPageAutoScroll();
      removePagePointerWindowHandlers();
      removePageMouseWindowHandlers();
      onInternalDragActiveChange(false);
    },
    [onInternalDragActiveChange],
  );

  const requestPageExclusion = (page: PageItem) => {
    const targets = page.selected ? pages.filter((item) => item.selected) : [page];
    togglePageExcluded((targets[0] ?? page).id);
  };

  const requestPageExclusionById = (pageId: string) => {
    const page = pages.find((item) => item.id === pageId);
    if (page) {
      requestPageExclusion(page);
    }
  };

  const handlePageDrop = (event: DragEvent<HTMLButtonElement>, pageId: string) => {
    event.preventDefault();
    const toolId = event.dataTransfer.getData("application/pdf-workbench-tool") as ToolId;
    if (toolId) {
      if (toolId === "trash") {
        requestPageExclusionById(pageId);
      } else if (toolId === "scissors") {
        togglePageSplit(pageId);
      } else if (decorationToolIds.includes(toolId as DecorationKind)) {
        applyDecorationToTarget(toolId as DecorationKind, { pageId });
      }
      setDropTarget(null);
      return;
    }

    setDraggingPageId(null);
    setDropTarget(null);
  };

  const activeDecorationKind = decorationToolIds.includes(activeTool as DecorationKind)
    ? (activeTool as DecorationKind)
    : undefined;
  const activePanel =
    activeTool === "lock" ? (
      <SecurityPanel onClose={() => setSettingsPanelHidden(true)} />
    ) : activeTool === "info" ? (
      <InfoPanel file={expandedFile ?? files[0]} onClose={() => setSettingsPanelHidden(true)} />
    ) : activeDecorationKind ? (
      <DecorationPanel
        kind={activeDecorationKind}
        panelPosition={decorationPanelPosition}
        onPanelPositionChange={setDecorationPanelPosition}
        onClose={() => setSettingsPanelHidden(true)}
      />
    ) : (
      null
    );
  const hasFloatingPanel = Boolean(activeTool === "lock" || activeTool === "info" || activeDecorationKind);

  return (
    <section className="workspace-section page-editor">
      <div className="section-heading">
        <div>
          <h2>{expandedFile ? `${expandedFile.name} 展開中` : "ページタイムライン"}</h2>
          <p>
            {expandedFile
              ? `${pages.length}ページをページ単位で編集中`
              : "展開済みファイルはありません"}
          </p>
        </div>
        <div className="editor-summary">
          <span>{pages.length}ページ</span>
          <span>除外 {outputPlan.excludedPageCount}</span>
          <span>分割 {outputPlan.splitCount}</span>
          <span>装飾 {outputPlan.decorationCount}</span>
        </div>
      </div>

      <div
        className="page-timeline"
        onScroll={(event) => setTimelineScrollTop(event.currentTarget.scrollTop)}
        ref={pageTimelineRef}
      >
        {pages.length > 0 ? (
          <>
            {topSpacerHeight > 0 && (
              <div className="page-timeline-spacer" style={{ height: topSpacerHeight }} />
            )}
            {visiblePages.map((page) => (
              <PageCard
                page={withOutputPageNumber(page, outputPageNumbers)}
                fileId={expandedFile?.id ?? ""}
                decorations={decorations}
                draggingPageId={draggingPageId}
                dropTarget={dropTarget}
                onDragOver={handlePageDragOver}
                onDrop={handlePageDrop}
                onPointerDragStart={handlePagePointerDragStart}
                onPointerDragMove={handlePagePointerDragMove}
                onPointerDragEnd={handlePagePointerDragEnd}
                onPointerDragCancel={handlePagePointerDragCancel}
                onMouseDragStart={handlePageMouseDragStart}
                onMouseDragMove={handlePageMouseDragMove}
                onMouseDragEnd={handlePageMouseDragEnd}
                onRequestToggleExcluded={requestPageExclusion}
                key={page.id}
              />
            ))}
            {bottomSpacerHeight > 0 && (
              <div className="page-timeline-spacer" style={{ height: bottomSpacerHeight }} />
            )}
          </>
        ) : (
          <div className="empty-timeline">ファイルカードを展開してください</div>
        )}
      </div>

      {!settingsPanelHidden && activePanel}
      {settingsPanelHidden && hasFloatingPanel && (
        <button className="floating-panel-reopen" onClick={() => setSettingsPanelHidden(false)}>
          <BadgeInfo size={15} />
          設定
        </button>
      )}
    </section>
  );
}

function OutputBar({
  logOpen,
  onToggleLog,
}: {
  logOpen: boolean;
  onToggleLog: () => void;
}) {
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const files = useWorkbenchStore((state) => state.files);
  const exportJob = useWorkbenchStore((state) => state.exportJob);
  const lastOutputFiles = useWorkbenchStore((state) => state.lastOutputFiles);
  const cancelExportJob = useWorkbenchStore((state) => state.cancelExportJob);
  const addLog = useWorkbenchStore((state) => state.addLog);
  const handleCancel = async () => {
    if (isTauriRuntime()) {
      try {
        await cancelCurrentExportWithEngine();
      } catch (error) {
        useWorkbenchStore
          .getState()
          .addLog("warn", `キャンセル要求の送信に失敗しました: ${errorMessage(error)}`);
        cancelExportJob();
      }
      return;
    }
    cancelExportJob();
  };
  const conversionFiles = files.filter(
    (file) =>
      !file.excluded &&
      !(file.sourcePath?.startsWith("sample://") || file.sourcePath?.startsWith("session://")) &&
      file.cacheState !== "error",
  );
  const pendingCount = conversionFiles.filter((file) =>
    ["queued", "converting", "stale"].includes(file.cacheState),
  ).length;
  const conversionProgress =
    conversionFiles.length === 0
      ? 0
      : Math.round(
          conversionFiles.reduce((sum, file) => {
            if (file.cacheState === "ready") {
              return sum + 100;
            }
            if (file.cacheState === "converting") {
              return sum + (file.progress ?? 0);
            }
            return sum;
          }, 0) / conversionFiles.length,
        );
  const isPreparing = pendingCount > 0;
  const queueLabel = conversionQueueLabel(files);
  const progressWidth =
    exportJob.status === "running" || exportJob.status === "completed"
      ? `${exportJob.progress}%`
      : isPreparing
        ? `${conversionProgress}%`
        : "0%";
  const statusLabel =
    exportJob.status === "running"
      ? exportJob.currentStep
      : isPreparing
        ? queueLabel || `変換中 ${conversionProgress}%`
        : exportJob.status === "idle"
          ? queueLabel
          : exportJob.message;
  const outputNames = plannedOutputNames(outputPlan);
  const pageReadout =
    outputPlan.activePageCount > 0
      ? `${outputPlan.activePageCount}ページ`
      : outputPlan.activeFileCount > 0
        ? `${outputPlan.activeFileCount}件 準備待ち`
        : "0ページ";
  const firstOutputFile = lastOutputFiles[0];
  const openFirstOutput = async () => {
    if (!firstOutputFile) {
      return;
    }
    try {
      await openOutputPath(firstOutputFile);
    } catch (error) {
      addLog("warn", `出力ファイルを開けませんでした: ${errorMessage(error)}`);
    }
  };
  const revealFirstOutput = async () => {
    if (!firstOutputFile) {
      return;
    }
    try {
      await revealOutputPath(firstOutputFile);
    } catch (error) {
      addLog("warn", `出力フォルダを開けませんでした: ${errorMessage(error)}`);
    }
  };

  return (
    <footer className="output-bar">
      <div className="output-plan">
        <div className="output-title">
          <BadgeInfo size={17} />
          出力予定 {outputPlan.outputCount}ファイル
        </div>
        <div className="output-files">
          {outputNames.map((file) => (
            <span key={file}>{file}</span>
          ))}
          <span className="locked-chip">
            <KeyRound size={13} />
            {outputPlan.encrypted ? "暗号化あり" : "暗号化なし"}
          </span>
          <span>
            <ListChecks size={13} />
            {pageReadout}
          </span>
        </div>
      </div>
      <div className="job-status">
        {statusLabel && <span>{statusLabel}</span>}
        <div className="job-track">
          <span style={{ width: progressWidth }} />
        </div>
        {exportJob.status === "running" && (
          <button onClick={handleCancel}>
            <CircleStop size={16} />
            中止
          </button>
        )}
        {exportJob.status === "completed" && firstOutputFile && (
          <>
            <button onClick={openFirstOutput} title={firstOutputFile}>
              <ExternalLink size={16} />
              開く
            </button>
            <button onClick={revealFirstOutput} title={firstOutputFile}>
              <FolderOpen size={16} />
              フォルダ
            </button>
          </>
        )}
        <button aria-expanded={logOpen} onClick={onToggleLog}>
          <Logs size={16} />
          ログ
        </button>
      </div>
    </footer>
  );
}

function ExportPreviewModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const files = useWorkbenchStore((state) => state.files);
  const pagesByFile = useWorkbenchStore((state) => state.pagesByFile);
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const decorations = useWorkbenchStore((state) => state.decorations);
  const exportJob = useWorkbenchStore((state) => state.exportJob);
  const cacheSession = useWorkbenchStore((state) => state.cacheSession);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settledPreviewIndex, setSettledPreviewIndex] = useState(0);
  const [previewInfoOpen, setPreviewInfoOpen] = useState(false);
  const [pageAspectRatios, setPageAspectRatios] = useState<Record<string, number>>({});
  const [decorationPreviewPages, setDecorationPreviewPages] = useState<Record<string, DecorationPreviewState>>({});
  const [previewCanvasSize, setPreviewCanvasSize] = useState<PreviewCanvasSize | null>(null);
  const [previewImageFallbacks, setPreviewImageFallbacks] = useState<Record<string, boolean>>({});
  const [previewHighResReady, setPreviewHighResReady] = useState<Record<string, boolean>>({});
  const [previewPageImages, setPreviewPageImages] = useState<Record<string, PreviewPageImageState>>({});
  const [pageJumpValue, setPageJumpValue] = useState("1");
  const [filmstripScrollLeft, setFilmstripScrollLeft] = useState(0);
  const [filmstripViewportWidth, setFilmstripViewportWidth] = useState(0);
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const decorationPreviewPagesRef = useRef<Record<string, DecorationPreviewState>>({});
  const previewHighResReadyRef = useRef<Record<string, boolean>>({});
  const previewImageFallbacksRef = useRef<Record<string, boolean>>({});
  const previewPageImagesRef = useRef<Record<string, PreviewPageImageState>>({});
  const previewImageRequestsRef = useRef<Set<string>>(new Set());
  const decorationPreviewGenerationRef = useRef(0);
  const groups = useMemo(
    () => buildExportPreviewGroups(files, pagesByFile, outputPlan),
    [files, outputPlan, pagesByFile],
  );
  const pages = useMemo(() => flattenExportPreviewGroups(groups), [groups]);
  const pendingFiles = useMemo(
    () =>
      files.filter(
        (file) =>
          !file.excluded && ["queued", "converting", "stale"].includes(file.cacheState),
      ),
    [files],
  );
  const previewSignature = useMemo(
    () => exportPreviewSignature(files, pagesByFile, decorations, outputPlan),
    [decorations, files, outputPlan, pagesByFile],
  );
  const decorationPreviewAvailable =
    isTauriRuntime() && Boolean(cacheSession.path) && pendingFiles.length === 0 && pages.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    setPreviewInfoOpen(false);
    setCurrentIndex((index) =>
      pages.length === 0 ? 0 : Math.min(Math.max(index, 0), pages.length - 1),
    );
    setSettledPreviewIndex((index) =>
      pages.length === 0 ? 0 : Math.min(Math.max(index, 0), pages.length - 1),
    );
  }, [open, pages.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return;
      }
      if (pages.length === 0) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentIndex((index) => Math.max(0, index - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentIndex((index) => Math.min(pages.length - 1, index + 1));
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, pages.length]);

  const currentPage = pages[currentIndex];
  const currentKey = currentPage ? decorationPreviewKey(currentPage) : "";

  const requestPreviewPageImage = useCallback(
    (page: ExportPreviewFilmstripPage | undefined, desiredZoom: number) => {
      if (!page || !cacheSession.path || !isTauriRuntime()) {
        return;
      }
      const pageKey = decorationPreviewKey(page);
      const roundedZoom = Math.round(desiredZoom * 100);
      const requestKey = `${pageKey}:${roundedZoom}`;
      const currentPreviewImage = previewPageImagesRef.current[pageKey];
      if (
        currentPreviewImage?.previewPath &&
        (currentPreviewImage.previewZoom ?? 0) >= desiredZoom - 0.05
      ) {
        return;
      }
      if (previewImageRequestsRef.current.has(requestKey)) {
        return;
      }
      previewImageRequestsRef.current.add(requestKey);
      void renderExportPreviewPageImage(page.id, cacheSession.path, {
        previewZoom: desiredZoom,
      }).then((result) => {
        if (!result.thumbnailPath && !result.previewPath) {
          return;
        }
        setPreviewPageImages((current) => {
          const next = {
            ...current,
            [pageKey]: {
              thumbnailPath: result.thumbnailPath,
              previewPath: result.previewPath,
              previewZoom: result.previewZoom ?? desiredZoom,
            },
          };
          previewPageImagesRef.current = next;
          return next;
        });
      });
    },
    [cacheSession.path],
  );

  useEffect(() => {
    decorationPreviewPagesRef.current = decorationPreviewPages;
  }, [decorationPreviewPages]);

  useEffect(() => {
    previewHighResReadyRef.current = previewHighResReady;
  }, [previewHighResReady]);

  useEffect(() => {
    previewImageFallbacksRef.current = previewImageFallbacks;
  }, [previewImageFallbacks]);

  useEffect(() => {
    previewPageImagesRef.current = previewPageImages;
  }, [previewPageImages]);

  const commitDecorationPreviewState = useCallback(
    (key: string, nextState: DecorationPreviewState) => {
      setDecorationPreviewPages((current) => {
        const currentState = current[key];
        if (
          currentState?.status === "ready" &&
          (nextState.status === "manifest" || nextState.status === "error")
        ) {
          return current;
        }
        if (
          currentState?.status === nextState.status &&
          currentState.manifest === nextState.manifest &&
          currentState.overlay === nextState.overlay
        ) {
          return current;
        }
        const next = { ...current, [key]: { ...currentState, ...nextState } };
        decorationPreviewPagesRef.current = next;
        return next;
      });
    },
    [],
  );

  const refineDecorationPreviewPage = useCallback(
    async (
      page: ExportPreviewFilmstripPage,
      generation: number,
      shouldAbort: () => boolean,
    ) => {
      if (!cacheSession.path || shouldAbort()) {
        return;
      }
      const sessionPath = cacheSession.path;
      const key = decorationPreviewKey(page);
      const cacheKey = decorationPreviewCacheKey(previewSignature, page);
      const cached = decorationPreviewSessionCache.get(cacheKey);
      if (cached?.status === "ready" && cached.overlay) {
        commitDecorationPreviewState(key, cached);
        return;
      }

      let manifest = cached?.manifest;
      if (!manifest) {
        try {
          manifest = await requestDecorationManifestPage(sessionPath, previewSignature, page);
        } catch {
          if (!shouldAbort() && decorationPreviewGenerationRef.current === generation) {
            commitDecorationPreviewState(key, { status: "error" });
          }
          return;
        }
      }

      if (shouldAbort() || decorationPreviewGenerationRef.current !== generation) {
        return;
      }

      const manifestState: DecorationPreviewState = { status: "manifest", manifest };
      rememberDecorationPreviewCache(cacheKey, manifestState);
      commitDecorationPreviewState(key, manifestState);

      if (manifest.items.length === 0 || shouldAbort()) {
        return;
      }

      try {
        const overlay = await requestDecorationOverlayPage(
          sessionPath,
          previewSignature,
          page,
          manifest,
        );
        if (shouldAbort() || decorationPreviewGenerationRef.current !== generation) {
          return;
        }
        const readyState: DecorationPreviewState = {
          status: "ready",
          manifest: overlay,
          overlay,
        };
        rememberDecorationPreviewCache(cacheKey, readyState);
        commitDecorationPreviewState(key, readyState);
      } catch {
        if (!shouldAbort() && decorationPreviewGenerationRef.current === generation) {
          commitDecorationPreviewState(key, { status: "error", manifest });
        }
      }
    },
    [cacheSession.path, commitDecorationPreviewState, previewSignature],
  );

  useEffect(() => {
    decorationPreviewGenerationRef.current += 1;
    const cachedPages = cachedDecorationPreviewPages(previewSignature, pages);
    decorationPreviewPagesRef.current = cachedPages;
    setDecorationPreviewPages(cachedPages);
    previewImageFallbacksRef.current = {};
    previewHighResReadyRef.current = {};
    previewPageImagesRef.current = {};
    previewImageRequestsRef.current.clear();
    setPreviewImageFallbacks({});
    setPreviewHighResReady({});
    setPreviewPageImages({});
  }, [open, pages.length, previewSignature]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const node = previewCanvasRef.current;
    if (!node) {
      return;
    }

    const updateCanvasSize = () => {
      const rect = node.getBoundingClientRect();
      const nextSize = {
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      };
      setPreviewCanvasSize((current) => {
        if (
          current &&
          Math.abs(current.width - nextSize.width) < 1 &&
          Math.abs(current.height - nextSize.height) < 1
        ) {
          return current;
        }
        return nextSize;
      });
    };

    updateCanvasSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateCanvasSize);
      return () => window.removeEventListener("resize", updateCanvasSize);
    }

    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const node = filmstripRef.current;
    if (!node) {
      return;
    }

    const updateFilmstripViewport = () => {
      setFilmstripViewportWidth(node.clientWidth);
      setFilmstripScrollLeft(node.scrollLeft);
    };
    updateFilmstripViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFilmstripViewport);
      return () => window.removeEventListener("resize", updateFilmstripViewport);
    }

    const observer = new ResizeObserver(updateFilmstripViewport);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSettledPreviewIndex(currentIndex);
    }, previewNavigationSettleMs);
    return () => window.clearTimeout(timer);
  }, [currentIndex, open]);

  useEffect(() => {
    if (
      !open ||
      !decorationPreviewAvailable ||
      !cacheSession.path ||
      pages.length === 0 ||
      settledPreviewIndex !== currentIndex
    ) {
      return;
    }

    const generation = decorationPreviewGenerationRef.current;
    const targetPage = pages[settledPreviewIndex];
    if (!targetPage) {
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const shouldAbort = () =>
      cancelled || decorationPreviewGenerationRef.current !== generation;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, ms);
        timers.push(timer);
      });

    void (async () => {
      await refineDecorationPreviewPage(targetPage, generation, shouldAbort);
      if (shouldAbort()) {
        return;
      }

      await wait(previewNeighborPrefetchDelayMs);
      const neighborPages = [
        pages[settledPreviewIndex - 1],
        pages[settledPreviewIndex + 1],
      ].filter((page): page is ExportPreviewFilmstripPage => Boolean(page));
      for (const page of neighborPages) {
        if (shouldAbort()) {
          return;
        }
        const key = decorationPreviewKey(page);
        if (decorationPreviewPagesRef.current[key]?.status === "ready") {
          continue;
        }
        await refineDecorationPreviewPage(page, generation, shouldAbort);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    cacheSession.path,
    currentIndex,
    decorationPreviewAvailable,
    open,
    pages,
    refineDecorationPreviewPage,
    settledPreviewIndex,
  ]);

  useEffect(() => {
    if (!open || pages.length === 0 || pendingFiles.length > 0 || settledPreviewIndex !== currentIndex) {
      return;
    }

    const targetPage = pages[settledPreviewIndex];
    const targetZoom = previewRenderZoomForCanvas(
      previewCanvasSize,
      targetPage ? pageAspectRatios[decorationPreviewKey(targetPage)] : undefined,
    );
    requestPreviewPageImage(targetPage, targetZoom);
    const timer = window.setTimeout(() => {
      const neighborZoom = Math.max(1.45, targetZoom - 0.2);
      requestPreviewPageImage(pages[settledPreviewIndex - 1], neighborZoom);
      requestPreviewPageImage(pages[settledPreviewIndex + 1], neighborZoom);
    }, previewNeighborPrefetchDelayMs);
    return () => window.clearTimeout(timer);
  }, [
    currentIndex,
    open,
    pageAspectRatios,
    pages,
    pendingFiles.length,
    previewCanvasSize,
    requestPreviewPageImage,
    settledPreviewIndex,
  ]);

  useEffect(() => {
    if (!open || pages.length === 0 || settledPreviewIndex !== currentIndex) {
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const loadHighResPage = (page: ExportPreviewFilmstripPage | undefined) => {
      if (!page || cancelled) {
        return;
      }
      const key = decorationPreviewKey(page);
      const previewImage = previewPageImagesRef.current[key];
      const thumbnailPath = page.thumbnailPath ?? previewImage?.thumbnailPath;
      const previewPath = previewImage?.previewPath ?? page.previewPath;
      if (
        previewHighResReadyRef.current[key] ||
        previewImageFallbacksRef.current[key] ||
        !previewPath ||
        !thumbnailPath ||
        previewPath === thumbnailPath
      ) {
        return;
      }
      const src = localAssetSrc(previewPath);
      if (!src) {
        return;
      }
      const image = new Image();
      image.onload = () => {
        if (cancelled) {
          return;
        }
        previewHighResReadyRef.current = {
          ...previewHighResReadyRef.current,
          [key]: true,
        };
        setPreviewHighResReady((current) =>
          current[key] ? current : { ...current, [key]: true },
        );
      };
      image.onerror = () => {
        if (cancelled) {
          return;
        }
        previewImageFallbacksRef.current = {
          ...previewImageFallbacksRef.current,
          [key]: true,
        };
        setPreviewImageFallbacks((current) =>
          current[key] ? current : { ...current, [key]: true },
        );
      };
      image.src = src;
    };

    loadHighResPage(pages[settledPreviewIndex]);
    const timer = window.setTimeout(() => {
      loadHighResPage(pages[settledPreviewIndex - 1]);
      loadHighResPage(pages[settledPreviewIndex + 1]);
    }, previewNeighborPrefetchDelayMs);
    timers.push(timer);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [currentIndex, open, pages, settledPreviewIndex]);

  useEffect(() => {
    if (!open || !currentKey) {
      return;
    }
    thumbnailRefs.current[currentKey]?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
  }, [currentKey, open]);

  useEffect(() => {
    if (!open || pages.length === 0) {
      return;
    }
    const node = filmstripRef.current;
    if (!node) {
      return;
    }
    const nextLeft = Math.max(
      0,
      currentIndex * previewFilmstripItemWidth - node.clientWidth / 2 + previewFilmstripItemWidth / 2,
    );
    if (Math.abs(node.scrollLeft - nextLeft) > previewFilmstripItemWidth * 1.5) {
      node.scrollLeft = nextLeft;
      setFilmstripScrollLeft(nextLeft);
    }
  }, [currentIndex, open, pages.length]);

  const goToPage = useCallback((nextIndex: number) => {
    if (pages.length === 0) {
      setCurrentIndex(0);
      setPageJumpValue("1");
      return;
    }
    const boundedIndex = Math.max(0, Math.min(pages.length - 1, nextIndex));
    setCurrentIndex((current) => (current === boundedIndex ? current : boundedIndex));
    setPageJumpValue(String(boundedIndex + 1));
  }, [pages.length]);

  useEffect(() => {
    setPageJumpValue(String(pages.length === 0 ? 1 : currentIndex + 1));
  }, [currentIndex, pages.length]);

  const rememberPageAspectRatio = useCallback(
    (pageKey: string, event: SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }
      const nextRatio = naturalWidth / naturalHeight;
      setPageAspectRatios((current) =>
        Math.abs((current[pageKey] ?? 0) - nextRatio) < 0.001
          ? current
          : { ...current, [pageKey]: nextRatio },
      );
    },
    [],
  );

  const setThumbnailRef = useCallback(
    (pageKey: string, node: HTMLButtonElement | null) => {
      thumbnailRefs.current[pageKey] = node;
    },
    [],
  );

  const fallbackToThumbnailPreview = useCallback(() => {
    const previewImage = currentKey ? previewPageImagesRef.current[currentKey] : undefined;
    const previewPath = previewImage?.previewPath ?? currentPage?.previewPath;
    const thumbnailPath = currentPage?.thumbnailPath ?? previewImage?.thumbnailPath;
    if (!currentPage || !currentKey || !previewPath || !thumbnailPath) {
      return;
    }
    if (previewPath === thumbnailPath) {
      return;
    }
    previewImageFallbacksRef.current = {
      ...previewImageFallbacksRef.current,
      [currentKey]: true,
    };
    setPreviewImageFallbacks((current) =>
      current[currentKey] ? current : { ...current, [currentKey]: true },
    );
  }, [currentKey, currentPage]);

  if (!open) {
    return null;
  }

  const currentPreviewImage = currentKey ? previewPageImages[currentKey] : undefined;
  const currentThumbnailPath = currentPage?.thumbnailPath ?? currentPreviewImage?.thumbnailPath;
  const currentPreviewPath = currentPreviewImage?.previewPath ?? currentPage?.previewPath;
  const currentImagePath =
    currentPage && currentKey && previewImageFallbacks[currentKey]
      ? currentThumbnailPath
      : currentPreviewPath &&
          (previewHighResReady[currentKey] || !currentThumbnailPath || Boolean(currentPreviewImage?.previewPath))
        ? currentPreviewPath
        : currentThumbnailPath ?? currentPreviewPath;
  const currentThumbnailSrc = localAssetSrc(currentImagePath);
  const visibleFilmstripStart = Math.max(
    0,
    Math.floor(filmstripScrollLeft / previewFilmstripItemWidth) - 6,
  );
  const visibleFilmstripEnd = Math.min(
    pages.length,
    Math.ceil(
      (filmstripScrollLeft + Math.max(filmstripViewportWidth, previewFilmstripItemWidth)) /
        previewFilmstripItemWidth,
    ) + 6,
  );
  const visibleFilmstripPages = pages.slice(visibleFilmstripStart, visibleFilmstripEnd);
  const leftFilmstripSpacer = visibleFilmstripStart * previewFilmstripItemWidth;
  const rightFilmstripSpacer = Math.max(0, pages.length - visibleFilmstripEnd) * previewFilmstripItemWidth;
  const outputStartIndexes = groups.reduce<number[]>((indexes, group, groupIndex) => {
    const previousCount = groups
      .slice(0, groupIndex)
      .reduce((count, item) => count + item.pages.length, 0);
    if (group.pages.length > 0) {
      indexes.push(previousCount);
    }
    return indexes;
  }, []);
  const currentOutputStartIndex =
    outputStartIndexes
      .slice()
      .reverse()
      .find((index) => index <= currentIndex) ?? 0;
  const nextOutputStartIndex = outputStartIndexes.find((index) => index > currentIndex);
  const previousOutputStartIndex = outputStartIndexes
    .slice()
    .reverse()
    .find((index) => index < currentOutputStartIndex);
  const canConfirmOutput = outputPlan.activeFileCount > 0;
  const submitPreviewJump = () => {
    const pageNumber = Number.parseInt(pageJumpValue, 10);
    if (!Number.isFinite(pageNumber)) {
      setPageJumpValue(String(currentIndex + 1));
      return;
    }
    goToPage(pageNumber - 1);
  };
  const currentDecorationPreview = currentKey ? decorationPreviewPages[currentKey] : undefined;
  const currentDecorationManifest =
    currentDecorationPreview?.manifest ?? currentDecorationPreview?.overlay;
  const currentDecorationOverlaySrc = localAssetSrc(currentDecorationPreview?.overlay?.overlayPath ?? undefined);
  const currentManifestAspectRatio =
    currentDecorationManifest?.pageWidthPt && currentDecorationManifest.pageHeightPt
      ? currentDecorationManifest.pageWidthPt / currentDecorationManifest.pageHeightPt
      : undefined;
  const currentAspectRatio =
    currentManifestAspectRatio ?? (currentKey ? pageAspectRatios[currentKey] : undefined);
  const currentPageFrameStyle = previewPageFrameStyle(currentAspectRatio, previewCanvasSize);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="export-preview-modal preview-modal-v2"
        role="dialog"
        aria-modal="true"
        aria-label="書き出しプレビュー"
      >
        <div className="preview-modal-top">
          <div className="preview-modal-title">
            <Eye size={18} />
            <strong>書き出しプレビュー</strong>
          </div>
          <div className="preview-modal-meta">
            <span>{outputPlan.outputCount}ファイル</span>
            <span>{pages.length}ページ</span>
            {currentPage && (
              <span>
                {currentPage.outputName} p{currentPage.outputPageNumber}
              </span>
            )}
            {pendingFiles.length > 0 && <span className="is-warning">準備中 {pendingFiles.length}</span>}
            <button
              className="icon-button"
              aria-expanded={previewInfoOpen}
              onClick={() => setPreviewInfoOpen((value) => !value)}
              title="プレビューの説明を表示"
              type="button"
            >
              <BadgeInfo size={17} />
            </button>
            <button className="icon-button" onClick={onClose} aria-label="プレビューを閉じる" type="button">
              <X size={18} />
            </button>
          </div>
          {previewInfoOpen && (
            <div className="preview-info-popover">
              除外ページは表示しません。下部のハサミ位置が分割後の出力境界です。ページ番号は結合後の出力順で表示します。
            </div>
          )}
        </div>

        <div className="preview-navigation">
          <button disabled={pages.length === 0 || currentIndex === 0} onClick={() => goToPage(0)} type="button">
            先頭
          </button>
          <button disabled={pages.length === 0 || currentIndex === 0} onClick={() => goToPage(currentIndex - 1)} type="button">
            前へ
          </button>
          <label>
            <span>ページ</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, pages.length)}
              value={pageJumpValue}
              onChange={(event) => setPageJumpValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitPreviewJump();
                }
              }}
            />
            <span>/ {Math.max(1, pages.length)}</span>
          </label>
          <button disabled={pages.length === 0} onClick={submitPreviewJump} type="button">
            移動
          </button>
          <button disabled={pages.length === 0 || currentIndex >= pages.length - 1} onClick={() => goToPage(currentIndex + 1)} type="button">
            次へ
          </button>
          <button disabled={pages.length === 0 || currentIndex >= pages.length - 1} onClick={() => goToPage(pages.length - 1)} type="button">
            末尾
          </button>
          <button
            disabled={previousOutputStartIndex === undefined}
            onClick={() => previousOutputStartIndex !== undefined && goToPage(previousOutputStartIndex)}
            type="button"
          >
            前の出力
          </button>
          <button
            disabled={nextOutputStartIndex === undefined}
            onClick={() => nextOutputStartIndex !== undefined && goToPage(nextOutputStartIndex)}
            type="button"
          >
            次の出力
          </button>
        </div>

        <div className="preview-stage">
          <button
            className="preview-nav-button is-prev"
            disabled={!currentPage || currentIndex === 0}
            onClick={() => goToPage(currentIndex - 1)}
            type="button"
            aria-label="前のページ"
          >
            <ChevronRight size={24} />
          </button>
          <div className="preview-canvas" ref={previewCanvasRef}>
            {currentPage ? (
              <div
                className="preview-live-page"
                style={currentPageFrameStyle}
                data-preview-quality={currentPreviewImage?.previewPath ? "high" : currentThumbnailSrc ? "light" : "empty"}
                data-preview-render-zoom={currentPreviewImage?.previewZoom?.toFixed(2)}
              >
                {currentThumbnailSrc ? (
                  <img
                    className="preview-live-thumbnail"
                    src={currentThumbnailSrc}
                    alt=""
                    draggable={false}
                    onLoad={(event) => rememberPageAspectRatio(currentKey, event)}
                    onError={fallbackToThumbnailPreview}
                  />
                ) : (
                  <div className="preview-live-placeholder">
                    <FileText size={48} />
                    <span>{currentPage.fileName}</span>
                  </div>
                )}
                <DecorationPreviewLayer
                  manifest={currentDecorationManifest}
                  overlaySrc={currentDecorationOverlaySrc}
                  idPrefix={`preview-${currentKey}`}
                />
              </div>
            ) : pendingFiles.length > 0 ? (
              <div className="preview-live-empty">
                <Loader2 size={40} />
                <span>PDF化後にプレビューを表示します</span>
              </div>
            ) : (
              <div className="preview-live-empty">出力対象ページがありません</div>
            )}
          </div>
          <button
            className="preview-nav-button"
            disabled={!currentPage || currentIndex >= pages.length - 1}
            onClick={() => goToPage(currentIndex + 1)}
            type="button"
            aria-label="次のページ"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div
          className="preview-filmstrip"
          aria-label="出力ページ一覧"
          ref={filmstripRef}
          onScroll={(event) => setFilmstripScrollLeft(event.currentTarget.scrollLeft)}
        >
          {pages.length > 0 ? (
            <>
            {leftFilmstripSpacer > 0 && (
              <div className="filmstrip-virtual-spacer" style={{ width: leftFilmstripSpacer }} />
            )}
            {visibleFilmstripPages.map((page, visibleIndex) => {
              const index = visibleFilmstripStart + visibleIndex;
              const pageKey = decorationPreviewKey(page);
              const previewImage = previewPageImages[pageKey];
              return (
                <PreviewFilmstripItem
                  key={pageKey}
                  page={page}
                  pageKey={pageKey}
                  index={index}
                  active={index === currentIndex}
                  aspectRatio={pageAspectRatios[pageKey]}
                  thumbnailPath={page.thumbnailPath ?? previewImage?.thumbnailPath}
                  decorationPreview={decorationPreviewPages[pageKey]}
                  onSelect={goToPage}
                  onImageLoad={rememberPageAspectRatio}
                  setThumbnailRef={setThumbnailRef}
                />
              );
            })
            }
            {rightFilmstripSpacer > 0 && (
              <div className="filmstrip-virtual-spacer" style={{ width: rightFilmstripSpacer }} />
            )}
            </>
          ) : (
            <div className="preview-empty">出力対象ページがありません</div>
          )}
        </div>

        <div className="preview-actions">
          <button onClick={onClose}>戻る</button>
          <button
            className="export-button"
            disabled={exportJob.status === "running" || !canConfirmOutput}
            onClick={onConfirm}
          >
            <FileOutput size={17} />
            この内容で書き出し
          </button>
        </div>
      </section>
    </div>
  );
}

function LogDrawerPreview({ open }: { open: boolean }) {
  const logs = useWorkbenchStore((state) => state.logs);
  const addLog = useWorkbenchStore((state) => state.addLog);

  if (!open) {
    return null;
  }

  const copyLogs = async () => {
    const text = logs.map((log) => `[${log.time}] ${log.level} ${log.message}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      addLog("info", "ログをクリップボードへコピーしました。");
    } catch {
      addLog("warn", "この環境ではログコピーを実行できませんでした。");
    }
  };

  return (
    <aside className="log-drawer-preview" aria-label="ログプレビュー">
      <div className="log-toolbar">
        <strong>詳細ログ</strong>
        <button onClick={copyLogs}>
          <Copy size={14} />
          コピー
        </button>
      </div>
      {logs.slice(0, 8).map((log) => (
        <div className="log-row" key={log.id}>
          <span className="log-time">{log.time}</span>
          <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
          <span className="log-message">{log.message}</span>
        </div>
      ))}
    </aside>
  );
}

export function App() {
  const [dropActive, setDropActive] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [exportCompletionNotice, setExportCompletionNotice] =
    useState<ExportCompletionNotice | null>(null);
  const [alphaLicense, setAlphaLicense] = useState<AlphaLicenseStatus | null>(null);
  const [e2eBootstrap, setE2eBootstrap] = useState<E2eBootstrapInfo | null>(null);
  const [fileOrderHeightPx, setFileOrderHeightPx] = useState<number | null>(null);
  const [isResizingFileOrder, setIsResizingFileOrder] = useState(false);
  const e2eStartedRef = useRef(false);
  const internalDragActiveRef = useRef(false);
  const workbenchRef = useRef<HTMLElement | null>(null);
  const fileOrderResizeRef = useRef<FileOrderResizeRef | null>(null);
  const lastCompletionNoticeAtRef = useRef<number | undefined>(undefined);
  const markInternalDragActive = useCallback((active: boolean) => {
    internalDragActiveRef.current = active;
    if (active) {
      setDropActive(false);
    }
  }, []);
  const measureFileOrderHeightBounds = useCallback(() => {
    const workbench = workbenchRef.current;
    const fileSection = workbench?.querySelector<HTMLElement>(".file-order-section");
    if (!workbench || !fileSection) {
      return null;
    }

    const workbenchStyle = window.getComputedStyle(workbench);
    const paddingTop = Number.parseFloat(workbenchStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(workbenchStyle.paddingBottom) || 0;
    const rowGap =
      Number.parseFloat(workbenchStyle.rowGap || workbenchStyle.gap) || 12;
    const compactLayout = window.matchMedia("(max-width: 980px), (max-height: 620px)").matches;
    const cssMinimumHeight = compactLayout ? 184 : 196;
    const pageMinimumHeight = compactLayout ? 118 : 220;
    const availableHeight =
      workbench.clientHeight - paddingTop - paddingBottom - rowGap;
    const maxHeight = Math.max(
      cssMinimumHeight,
      Math.floor(availableHeight - pageMinimumHeight),
    );

    const heading = fileSection.querySelector<HTMLElement>(".section-heading");
    const strip = fileSection.querySelector<HTMLElement>(".file-strip");
    const cards = Array.from(fileSection.querySelectorAll<HTMLElement>(".file-card"));
    const headingHeight = heading?.getBoundingClientRect().height ?? 38;
    const stripStyle = strip ? window.getComputedStyle(strip) : null;
    const stripPadding =
      (stripStyle ? Number.parseFloat(stripStyle.paddingTop) || 0 : 0) +
      (stripStyle ? Number.parseFloat(stripStyle.paddingBottom) || 0 : 0);
    const cardHeight = cards.reduce(
      (height, card) => Math.max(height, card.getBoundingClientRect().height),
      0,
    );
    const stripScrollbarAllowance =
      strip && strip.scrollWidth > strip.clientWidth ? 14 : 0;
    const minimumWithCards =
      cardHeight > 0
        ? Math.ceil(headingHeight + cardHeight + stripPadding + stripScrollbarAllowance + 6)
        : cssMinimumHeight;
    const minHeight = Math.min(
      maxHeight,
      Math.max(cssMinimumHeight, minimumWithCards),
    );
    const currentHeight = Math.round(fileSection.getBoundingClientRect().height);

    return {
      minHeight,
      maxHeight: Math.max(minHeight, maxHeight),
      currentHeight,
    };
  }, []);
  const clampFileOrderHeight = (
    height: number,
    bounds: Pick<FileOrderResizeRef, "minHeight" | "maxHeight">,
  ) => Math.round(Math.max(bounds.minHeight, Math.min(bounds.maxHeight, height)));
  const handleFileOrderResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = measureFileOrderHeightBounds();
    if (!bounds) {
      return;
    }
    const startHeight = clampFileOrderHeight(bounds.currentHeight, bounds);
    fileOrderResizeRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight,
      minHeight: bounds.minHeight,
      maxHeight: bounds.maxHeight,
    };
    setFileOrderHeightPx(startHeight);
    setIsResizingFileOrder(true);
    markInternalDragActive(true);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const handleFileOrderResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = fileOrderResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) {
      return;
    }
    const nextHeight = clampFileOrderHeight(
      resize.startHeight + event.clientY - resize.startY,
      resize,
    );
    setFileOrderHeightPx(nextHeight);
    event.preventDefault();
  };
  const finishFileOrderResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = fileOrderResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    fileOrderResizeRef.current = null;
    setIsResizingFileOrder(false);
    markInternalDragActive(false);
  };
  const handleFileOrderResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const bounds = measureFileOrderHeightBounds();
    if (!bounds) {
      return;
    }
    const baseHeight = fileOrderHeightPx ?? bounds.currentHeight;
    let nextHeight: number | null = null;
    if (event.key === "ArrowUp") {
      nextHeight = baseHeight - 12;
    } else if (event.key === "ArrowDown") {
      nextHeight = baseHeight + 12;
    } else if (event.key === "PageUp") {
      nextHeight = baseHeight - 36;
    } else if (event.key === "PageDown") {
      nextHeight = baseHeight + 36;
    } else if (event.key === "Home") {
      nextHeight = bounds.minHeight;
    } else if (event.key === "End") {
      nextHeight = bounds.maxHeight;
    } else if (event.key === "Escape") {
      setFileOrderHeightPx(null);
      return;
    }
    if (nextHeight === null) {
      return;
    }
    event.preventDefault();
    setFileOrderHeightPx(clampFileOrderHeight(nextHeight, bounds));
  };
  useEffect(() => {
    if (fileOrderHeightPx === null) {
      return undefined;
    }
    const workbench = workbenchRef.current;
    if (!workbench) {
      return undefined;
    }

    const keepFileOrderHeightInBounds = () => {
      const bounds = measureFileOrderHeightBounds();
      if (!bounds) {
        return;
      }
      setFileOrderHeightPx((height) =>
        height === null ? null : clampFileOrderHeight(height, bounds),
      );
    };

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", keepFileOrderHeightInBounds);
      return () => window.removeEventListener("resize", keepFileOrderHeightInBounds);
    }

    const observer = new ResizeObserver(keepFileOrderHeightInBounds);
    observer.observe(workbench);
    return () => observer.disconnect();
  }, [fileOrderHeightPx, measureFileOrderHeightBounds]);
  const addInputFiles = useWorkbenchStore((state) => state.addInputFiles);
  const addLog = useWorkbenchStore((state) => state.addLog);
  const undo = useWorkbenchStore((state) => state.undo);
  const redo = useWorkbenchStore((state) => state.redo);
  const deleteSelectedPages = useWorkbenchStore((state) => state.deleteSelectedPages);
  const removeFile = useWorkbenchStore((state) => state.removeFile);
  const setActiveTool = useWorkbenchStore((state) => state.setActiveTool);
  const setCacheSession = useWorkbenchStore((state) => state.setCacheSession);
  const cacheSession = useWorkbenchStore((state) => state.cacheSession);
  const backgroundProcessingPausedUntil = useWorkbenchStore(
    (state) => state.backgroundProcessingPausedUntil,
  );
  const tickBackgroundJobs = useWorkbenchStore((state) => state.tickBackgroundJobs);
  const tickExportJob = useWorkbenchStore((state) => state.tickExportJob);
  const loadDevelopmentFixture = useWorkbenchStore(
    (state) => state.loadDevelopmentFixture,
  );
  const loadLargePerformanceFixture = useWorkbenchStore(
    (state) => state.loadLargePerformanceFixture,
  );
  const loadHundredFilesPerformanceFixture = useWorkbenchStore(
    (state) => state.loadHundredFilesPerformanceFixture,
  );
  const loadOfficeQueuedFixture = useWorkbenchStore(
    (state) => state.loadOfficeQueuedFixture,
  );
  const exportJob = useWorkbenchStore((state) => state.exportJob);
  const lastOutputFiles = useWorkbenchStore((state) => state.lastOutputFiles);
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const expandedThumbnailFileId = useWorkbenchStore((state) => {
    const expandedReadyFile = state.files.find(
      (file) => file.expanded && file.cacheState === "ready",
    );
    if (!expandedReadyFile || expandedReadyFile.engineState === "synthetic") {
      return undefined;
    }
    const pages = state.pagesByFile[expandedReadyFile.id] ?? [];
    return pages.some((page) => !page.thumbnailPath) ? expandedReadyFile.id : undefined;
  });

  const requestRemoveFiles = useCallback(
    (targets: WorkbenchFile[]) => {
      if (targets.length === 0) {
        return;
      }
      const names = targets.map((file) => file.name).join(", ");
      setConfirmDialog({
        title: targets.length > 1 ? "複数ファイルを除外" : "ファイルを除外",
        message:
          targets.length > 1
            ? `${targets.length}件のファイルをワークスペースから除外します。`
            : `${names} をワークスペースから除外します。`,
        confirmLabel: "除外",
        cancelLabel: "戻る",
        danger: true,
        onConfirm: () => removeFile(targets[0].id),
      });
    },
    [removeFile],
  );

  useEffect(() => {
    if (exportJob.status !== "completed" || !exportJob.completedAt) {
      return;
    }
    if (lastCompletionNoticeAtRef.current === exportJob.completedAt) {
      return;
    }
    lastCompletionNoticeAtRef.current = exportJob.completedAt;
    setExportCompletionNotice({
      completedAt: exportJob.completedAt,
      outputFiles: lastOutputFiles.length > 0 ? lastOutputFiles : outputPlan.outputFiles,
    });
  }, [exportJob.status, exportJob.completedAt, lastOutputFiles, outputPlan.outputFiles]);

  useEffect(() => {
    if (!exportCompletionNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setExportCompletionNotice((current) =>
        current?.completedAt === exportCompletionNotice.completedAt ? null : current,
      );
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [exportCompletionNotice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fixture") === "hundred-files") {
      loadHundredFilesPerformanceFixture();
    } else if (params.get("fixture") === "large-pages") {
      loadLargePerformanceFixture();
    } else if (params.get("fixture") === "office-queued") {
      loadOfficeQueuedFixture();
    } else if (params.get("fixture") === "workbench") {
      loadDevelopmentFixture();
    }
    const tool = params.get("tool");
    if (toolItems.some((item) => item.id === tool)) {
      setActiveTool(tool as ToolId);
    }
  }, [
    loadDevelopmentFixture,
    loadHundredFilesPerformanceFixture,
    loadLargePerformanceFixture,
    loadOfficeQueuedFixture,
    setActiveTool,
  ]);

  useEffect(() => {
    let disposed = false;
    checkAlphaLicense()
      .then((license) => {
        if (!disposed) {
          setAlphaLicense(license);
        }
      })
      .catch((error) => {
        addLog("warn", `アルファ版の日時確認を実施できませんでした: ${errorMessage(error)}`);
        if (!disposed) {
          setAlphaLicense({
            valid: true,
            expiresOn: "2026-06-30",
            message: "Date check fallback",
          });
        }
      });

    return () => {
      disposed = true;
    };
  }, [addLog]);

  useEffect(() => {
    let disposed = false;
    getE2eBootstrap()
      .then((bootstrap) => {
        if (!disposed) {
          setE2eBootstrap(bootstrap);
          if (bootstrap.enabled) {
            addLog("info", "E2E起動設定を検出しました。");
          }
        }
      })
      .catch((error) => {
        addLog("warn", `E2E起動設定を確認できませんでした: ${errorMessage(error)}`);
        if (!disposed) {
          setE2eBootstrap({ enabled: false, files: [], autoExport: false });
        }
      });

    return () => {
      disposed = true;
    };
  }, [addLog]);

  useEffect(() => {
    if (!alphaLicense) {
      return undefined;
    }

    if (!alphaLicense.valid) {
      completeStartup().catch(() => undefined);
      return undefined;
    }

    let sessionId: string | undefined;
    prepareCacheSession()
      .then((session) => {
        if (session) {
          sessionId = session.id;
          setCacheSession(session);
        }
      })
      .catch((error) =>
        addLog("warn", `一時キャッシュを初期化できませんでした: ${errorMessage(error)}`),
      )
      .finally(() => {
        completeStartup().catch(() => undefined);
      });

    return () => {
      if (sessionId) {
        cleanupCacheSession(sessionId).catch(() => undefined);
      }
    };
  }, [addLog, alphaLicense, setCacheSession]);

  useEffect(() => {
    if (
      !alphaLicense?.valid ||
      !e2eBootstrap?.enabled ||
      !e2eBootstrap.autoExport ||
      !cacheSession.path ||
      e2eStartedRef.current
    ) {
      return;
    }

    const sessionPath = cacheSession.path;
    e2eStartedRef.current = true;

    const serializeE2eState = () => {
      const state = useWorkbenchStore.getState();
      return {
        files: state.files.map((file) => ({
          id: file.id,
          name: file.name,
          kind: file.kind,
          pageCount: file.pageCount,
          cacheState: file.cacheState,
          engineState: file.engineState,
          errorMessage: file.errorMessage,
        })),
        outputPlan: state.outputPlan,
        exportJob: state.exportJob,
        lastOutputFiles: state.lastOutputFiles,
        logs: state.logs.slice(0, 80),
      };
    };

    const reportE2e = async (payload: Record<string, unknown>) => {
      try {
        await writeE2eResult(payload);
      } catch (error) {
        addLog("warn", `E2E結果を書き込めませんでした: ${errorMessage(error)}`);
      }
    };

    const runE2e = async () => {
      const outputPath = e2eBootstrap.outputPath;
      if (!outputPath) {
        const message = "PDF_WORKBENCH_E2E_OUTPUT が未設定です。";
        useWorkbenchStore.getState().failExportJob(message);
        await reportE2e({ status: "error", message, snapshot: serializeE2eState() });
        return;
      }

      try {
        addLog("info", `E2Eファイル投入を開始します: ${e2eBootstrap.files.length}件`);
        const inputFiles = await describeInputPaths(e2eBootstrap.files);
        useWorkbenchStore.getState().addInputFiles(inputFiles);
        useWorkbenchStore.getState().setExportPath(outputPath);

        await processAllPendingEngineFiles(sessionPath);

        const readyState = useWorkbenchStore.getState();
        const firstFile = readyState.files[0];
        const firstFilePages = firstFile ? readyState.pagesByFile[firstFile.id] ?? [] : [];
        const splitTarget = firstFilePages[firstFilePages.length - 1];
        if (splitTarget && !splitTarget.splitAfter) {
          useWorkbenchStore.getState().togglePageSplit(splitTarget.id);
        }

        useWorkbenchStore
          .getState()
          .updateDecorationDraft("header", {
            text: "PDF Workbench E2E",
            position: "top-left",
            fontSize: 9,
          });
        useWorkbenchStore
          .getState()
          .updateDecorationDraft("footer", {
            text: "{page} / {total}",
            position: "bottom-right",
            fontSize: 9,
          });
        useWorkbenchStore
          .getState()
          .updateDecorationDraft("watermark", {
            text: "E2E CHECK",
            position: "center",
            color: "#d16b6b",
          });
        useWorkbenchStore.getState().placeDecoration("header");
        useWorkbenchStore.getState().placeDecoration("footer");
        useWorkbenchStore.getState().placeDecoration("watermark");

        resetCurrentExportCancellation();
        useWorkbenchStore.getState().startExportJob();
        useWorkbenchStore
          .getState()
          .setExportJobProgress(66, "結合", "E2E書き出しを実行中");
        const result = await exportCurrentWorkspaceWithEngine(outputPath);
        useWorkbenchStore.getState().completeExportJob(result.outputFiles);
        await reportE2e({
          status: "completed",
          outputFiles: result.outputFiles,
          snapshot: serializeE2eState(),
        });
      } catch (error) {
        const message = errorMessage(error);
        useWorkbenchStore.getState().failExportJob(message);
        await reportE2e({ status: "error", message, snapshot: serializeE2eState() });
      }
    };

    void runE2e();
  }, [addLog, alphaLicense?.valid, cacheSession.path, e2eBootstrap]);

  useEffect(() => {
    if (!cacheSession.path || !expandedThumbnailFileId || !isTauriRuntime()) {
      return;
    }
    void renderExpandedFileThumbnails(expandedThumbnailFileId, cacheSession.path);
  }, [cacheSession.path, expandedThumbnailFileId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!alphaLicense?.valid) {
        return;
      }
      if (
        internalDragActiveRef.current ||
        Date.now() < backgroundProcessingPausedUntil
      ) {
        return;
      }
      if (isTauriRuntime() && cacheSession.path) {
        processNextPendingEngineFile(cacheSession.path);
        return;
      }
      tickBackgroundJobs();
    }, 900);
    return () => window.clearInterval(timer);
  }, [alphaLicense?.valid, backgroundProcessingPausedUntil, cacheSession.path, tickBackgroundJobs]);

  useEffect(() => {
    if (isTauriRuntime()) {
      return;
    }
    const timer = window.setInterval(() => {
      tickExportJob();
    }, 700);
    return () => window.clearInterval(timer);
  }, [tickExportJob]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedPages();
        return;
      }
      if (event.key === "Escape") {
        setActiveTool("select");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedPages, redo, setActiveTool, undo]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const payload = event.payload;
        if (internalDragActiveRef.current) {
          setDropActive(false);
          return;
        }
        if (payload.type === "enter" || payload.type === "over") {
          setDropActive(true);
          return;
        }

        if (payload.type === "leave") {
          setDropActive(false);
          return;
        }

        if (payload.type === "drop") {
          setDropActive(false);
          if (payload.paths.length === 0) {
            return;
          }

          describeInputPaths(payload.paths)
            .then((files) => addInputFiles(files))
            .catch((error) =>
              addLog(
                "error",
                `Explorerからドロップされたファイルを読み込めませんでした: ${errorMessage(error)}`,
              ),
            );
        }
      })
      .then((unlistenFn) => {
        if (disposed) {
          unlistenFn();
          return;
        }
        unlisten = unlistenFn;
      })
      .catch((error) =>
        addLog(
          "warn",
          `OSドラッグ&ドロップの待ち受けを開始できませんでした: ${errorMessage(error)}`,
        ),
      );

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [addInputFiles, addLog]);

  const hasFileDrag = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const handleWorkbenchDragOver = (event: DragEvent<HTMLElement>) => {
    if (internalDragActiveRef.current) {
      event.preventDefault();
      setDropActive(false);
      return;
    }
    if (!hasFileDrag(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  };

  const handleWorkbenchDragLeave = (event: DragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDropActive(false);
  };

  const handleWorkbenchDrop = async (event: DragEvent<HTMLElement>) => {
    if (internalDragActiveRef.current) {
      event.preventDefault();
      setDropActive(false);
      return;
    }
    if (!event.dataTransfer.files.length) {
      if (hasFileDrag(event)) {
        event.preventDefault();
        setDropActive(false);
      }
      return;
    }
    event.preventDefault();
    setDropActive(false);
    try {
      const files = await droppedFilesToInputInfo(event.dataTransfer.files);
      addInputFiles(files);
    } catch (error) {
      addLog("error", `ドロップしたファイルを読めませんでした: ${errorMessage(error)}`);
    }
  };

  if (alphaLicense && !alphaLicense.valid) {
    return <AlphaExpiredScreen license={alphaLicense} />;
  }

  const workbenchStyle =
    fileOrderHeightPx === null
      ? undefined
      : ({
          "--file-order-height": `${fileOrderHeightPx}px`,
        } as CSSProperties);

  return (
    <div className={["app-shell", dropActive ? "is-drop-active" : ""].join(" ")}>
      <AppBar />
      <ToolBar />
      <main
        className={["workbench", isResizingFileOrder ? "is-resizing-file-order" : ""].join(" ")}
        ref={workbenchRef}
        style={workbenchStyle}
        onDragOver={handleWorkbenchDragOver}
        onDragLeave={handleWorkbenchDragLeave}
        onDrop={handleWorkbenchDrop}
      >
        <FileStrip
          onInternalDragActiveChange={markInternalDragActive}
          onRequestRemoveFiles={requestRemoveFiles}
        />
        <div
          className="workbench-resizer"
          role="separator"
          aria-label="ファイル順序エリアの高さ"
          aria-orientation="horizontal"
          tabIndex={0}
          title="ドラッグで高さを調整"
          onPointerDown={handleFileOrderResizeStart}
          onPointerMove={handleFileOrderResizeMove}
          onPointerUp={finishFileOrderResize}
          onPointerCancel={finishFileOrderResize}
          onKeyDown={handleFileOrderResizeKeyDown}
        >
          <span aria-hidden="true">
            <GripHorizontal size={18} />
          </span>
        </div>
        <ExpandedTimeline
          onInternalDragActiveChange={markInternalDragActive}
        />
      </main>
      <OutputBar logOpen={logOpen} onToggleLog={() => setLogOpen((open) => !open)} />
      <LogDrawerPreview open={logOpen} />
      <ExportCompletionPopup
        notice={exportCompletionNotice}
        onClose={() => setExportCompletionNotice(null)}
      />
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
