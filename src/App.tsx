import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  ArrowDown,
  ArrowUp,
  BadgeInfo,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Copy,
  Eye,
  FilePlus2,
  FileSearch,
  FileText,
  FolderOutput,
  Hash,
  Highlighter,
  Info,
  KeyRound,
  ListChecks,
  Loader2,
  Lock,
  Logs,
  MousePointer2,
  Redo2,
  Scissors,
  Search,
  Shield,
  Stamp,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { cleanupCacheSession, prepareCacheSession } from "./features/workbench/backend";
import {
  cancelCurrentExportWithEngine,
  exportCurrentWorkspaceWithEngine,
  isCurrentExportCancellationRequested,
  isProcessingEngineCancelled,
  processAllPendingEngineFiles,
  processNextPendingEngineFile,
  resetCurrentExportCancellation,
} from "./features/workbench/engineWorkflow";
import {
  browserFilesToInputInfo,
  describeInputPaths,
  droppedFilesToInputInfo,
  isTauriRuntime,
  openInputFilesDialog,
  openOutputDirectoryDialog,
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
  icon: typeof MousePointer2;
  danger?: boolean;
}> = [
  { id: "select", label: "選択", icon: MousePointer2 },
  { id: "scissors", label: "ハサミ", icon: Scissors },
  { id: "trash", label: "ゴミ箱", icon: Trash2, danger: true },
  { id: "header", label: "ヘッダー", icon: Type },
  { id: "footer", label: "フッター", icon: Highlighter },
  { id: "page-number", label: "ページ番号", icon: Hash },
  { id: "watermark", label: "透かし", icon: Stamp },
  { id: "search-replace", label: "検索置換", icon: Search },
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

type FilePointerDragRef = {
  fileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  target: FileDropTarget | null;
  active: boolean;
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
  target: PageDropTarget | null;
  active: boolean;
};

type ExportPreviewPage = PageItem & {
  fileName: string;
  fileKind: FileKind;
};

type ExportPreviewGroup = {
  name: string;
  pages: ExportPreviewPage[];
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

function cacheLabel(file: WorkbenchFile): string {
  if (file.cacheState === "ready") {
    return "PDF準備完了";
  }
  if (file.cacheState === "queued") {
    return "PDF化待機";
  }
  if (file.cacheState === "error") {
    return "変換エラー";
  }
  if (file.cacheState === "stale") {
    return "再変換必要";
  }
  return `PDF化中 ${file.progress ?? 0}%`;
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

function buildExportPreviewGroups(
  files: WorkbenchFile[],
  pagesByFile: Record<string, PageItem[]>,
  outputPlan: OutputPlan,
): ExportPreviewGroup[] {
  if (outputPlan.outputFiles.length === 0) {
    return [];
  }

  const groups = outputPlan.outputFiles.map((name) => ({ name, pages: [] as ExportPreviewPage[] }));
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

function positionLabel(position: DecorationPosition): string {
  switch (position) {
    case "top":
      return "上";
    case "bottom":
      return "下";
    case "bottom-left":
      return "左下";
    case "bottom-center":
      return "中央下";
    case "bottom-right":
      return "右下";
    case "center":
      return "中央";
  }
}

function AppBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectingFiles, setSelectingFiles] = useState(false);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const undo = useWorkbenchStore((state) => state.undo);
  const redo = useWorkbenchStore((state) => state.redo);
  const canUndo = useWorkbenchStore((state) => state.canUndo);
  const canRedo = useWorkbenchStore((state) => state.canRedo);
  const addInputFiles = useWorkbenchStore((state) => state.addInputFiles);
  const addLog = useWorkbenchStore((state) => state.addLog);
  const setExportDirectory = useWorkbenchStore((state) => state.setExportDirectory);
  const startExportJob = useWorkbenchStore((state) => state.startExportJob);
  const setExportJobProgress = useWorkbenchStore((state) => state.setExportJobProgress);
  const completeExportJob = useWorkbenchStore((state) => state.completeExportJob);
  const failExportJob = useWorkbenchStore((state) => state.failExportJob);
  const exportJob = useWorkbenchStore((state) => state.exportJob);
  const exportDirectory = useWorkbenchStore((state) => state.exportDirectory);
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

  const handleOutputDirectory = async () => {
    try {
      if (!isTauriRuntime()) {
        setExportDirectory("ブラウザ検証用の出力先");
        return;
      }
      const directory = await openOutputDirectoryDialog();
      if (directory) {
        setExportDirectory(directory);
      }
    } catch (error) {
      addLog("error", `出力先を設定できませんでした: ${errorMessage(error)}`);
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

    if (outputPlan.activePageCount === 0) {
      addLog("warn", "書き出し対象のページがありません。ファイルを追加してください。");
      return;
    }

    if (!isTauriRuntime()) {
      startExportJob();
      return;
    }

    let directory = exportDirectory;
    if (!directory) {
      try {
        const selected = await openOutputDirectoryDialog();
        if (!selected) {
          addLog("warn", "出力先の選択がキャンセルされました。");
          return;
        }
        directory = selected;
        setExportDirectory(selected);
      } catch (error) {
        addLog("error", `出力先を設定できませんでした: ${errorMessage(error)}`);
        return;
      }
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
      const result = await exportCurrentWorkspaceWithEngine(directory);
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

    if (outputPlan.activePageCount === 0) {
      addLog("warn", "書き出し対象のページがありません。ファイルを追加して展開してください。");
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
        <button onClick={handleOutputDirectory} title={exportDirectory ?? "出力先未設定"}>
          <FolderOutput size={17} />
          出力先
        </button>
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
        <button
          className="export-button"
          disabled={exportJob.status === "running" || outputPlan.activePageCount === 0}
          onClick={requestExportPreview}
        >
          <Upload size={17} />
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
  draggingFileId,
  dropTarget,
  onPointerDragStart,
  onPointerDragMove,
  onPointerDragEnd,
  onPointerDragCancel,
}: {
  file: WorkbenchFile;
  index: number;
  fileCount: number;
  thumbnailPath?: string;
  draggingFileId: string | null;
  dropTarget: FileDropTarget | null;
  onPointerDragStart: (event: React.PointerEvent<HTMLElement>, fileId: string) => void;
  onPointerDragMove: (event: React.PointerEvent<HTMLElement>, fileId: string) => boolean;
  onPointerDragEnd: (event: React.PointerEvent<HTMLElement>, fileId: string) => boolean;
  onPointerDragCancel: (event: React.PointerEvent<HTMLElement>, fileId: string) => void;
}) {
  const ready = file.cacheState === "ready";
  const thumbnailSrc = localAssetSrc(thumbnailPath);
  const toggleFileExpanded = useWorkbenchStore(
    (state) => state.toggleFileExpanded,
  );
  const toggleFileExcluded = useWorkbenchStore((state) => state.toggleFileExcluded);
  const moveFile = useWorkbenchStore((state) => state.moveFile);
  const prioritizeFileConversion = useWorkbenchStore(
    (state) => state.prioritizeFileConversion,
  );
  const dropClass =
    dropTarget?.fileId === file.id ? `is-drop-${dropTarget.position}` : "";
  const clickGuardRef = useRef(false);
  const activateFile = () => {
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
      event.button !== 0 ||
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
        draggingFileId === file.id ? "is-dragging" : "",
        dropClass,
      ].join(" ")}
      tabIndex={0}
      data-file-card-id={file.id}
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
        <div className={["preview-paper", thumbnailSrc ? "has-thumbnail" : ""].join(" ")}>
          {thumbnailSrc ? (
            <img className="file-thumbnail" src={thumbnailSrc} alt="" draggable={false} />
          ) : ready ? (
            <FileText size={32} />
          ) : (
            <Loader2 size={32} />
          )}
          <span>{index + 1}</span>
        </div>
        {file.cacheState === "converting" && (
          <div className="progress-ring">
            <Loader2 size={22} />
          </div>
        )}
      </div>
      <div className="file-name" title={file.name}>
        {file.name}
      </div>
      <div className="file-meta">
        <span className={`cache-badge state-${file.cacheState}`}>
          {cacheLabel(file)}
        </span>
        <span>{pageCountLabel(file)}</span>
      </div>
      <div className="file-submeta">
        <span>{file.extension?.toUpperCase() ?? "形式未取得"}</span>
        <span>{formatSize(file.sizeBytes)}</span>
      </div>
      {file.errorMessage && (
        <div className="file-error" title={file.errorMessage}>
          {file.errorMessage}
        </div>
      )}
      {file.cacheState === "converting" && (
        <div className="mini-progress" aria-label={cacheLabel(file)}>
          <span style={{ width: `${file.progress ?? 0}%` }} />
        </div>
      )}
      <div className="file-card-actions">
        <button onClick={() => moveFile(file.id, -1)} disabled={index === 0}>
          <ArrowUp size={14} />
        </button>
        <button onClick={() => moveFile(file.id, 1)} disabled={index === fileCount - 1}>
          <ArrowDown size={14} />
        </button>
        <button onClick={() => toggleFileExcluded(file.id)}>
          {file.excluded ? "復帰" : "除外"}
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

function FileStrip() {
  const files = useWorkbenchStore((state) => state.files);
  const pagesByFile = useWorkbenchStore((state) => state.pagesByFile);
  const moveFileToIndex = useWorkbenchStore((state) => state.moveFileToIndex);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<FileDropTarget | null>(null);
  const [dragPreview, setDragPreview] = useState<FileDragPreview | null>(null);
  const pointerDragRef = useRef<FilePointerDragRef | null>(null);

  const firstThumbnailPath = (fileId: string) =>
    pagesByFile[fileId]?.find((page) => Boolean(page.thumbnailPath))?.thumbnailPath;

  const fileDropTargetFromPoint = (
    clientX: number,
    clientY: number,
  ): FileDropTarget | null => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-file-card-id]"),
    );
    if (cards.length === 0) {
      return null;
    }

    const hitCard = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    });

    const targetCard =
      hitCard ??
      cards.reduce<HTMLElement | null>((closest, card) => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(clientX - centerX, clientY - centerY);
        if (!closest) {
          card.dataset.pointerDistance = String(distance);
          return card;
        }
        const closestDistance = Number(closest.dataset.pointerDistance ?? Infinity);
        if (distance < closestDistance) {
          card.dataset.pointerDistance = String(distance);
          return card;
        }
        return closest;
      }, null);

    cards.forEach((card) => {
      delete card.dataset.pointerDistance;
    });

    if (!targetCard?.dataset.fileCardId) {
      return null;
    }

    const rect = targetCard.getBoundingClientRect();
    return {
      fileId: targetCard.dataset.fileCardId,
      position: clientX > rect.left + rect.width / 2 ? "after" : "before",
    };
  };

  const resetPointerDrag = () => {
    pointerDragRef.current = null;
    setDraggingFileId(null);
    setDropTarget(null);
    setDragPreview(null);
  };

  const handlePointerDragStart = (
    event: React.PointerEvent<HTMLElement>,
    fileId: string,
  ) => {
    pointerDragRef.current = {
      fileId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: null,
      active: false,
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

    drag.active = true;
    event.preventDefault();
    const nextTarget = fileDropTargetFromPoint(event.clientX, event.clientY);
    drag.target = nextTarget;
    setDraggingFileId(drag.fileId);
    setDropTarget(nextTarget);
    setDragPreview({ fileId: drag.fileId, x: event.clientX, y: event.clientY });
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

  const dragPreviewFile = dragPreview
    ? files.find((file) => file.id === dragPreview.fileId)
    : undefined;
  const dragPreviewThumbnail = dragPreviewFile
    ? localAssetSrc(firstThumbnailPath(dragPreviewFile.id))
    : undefined;

  return (
    <section className="workspace-section">
      <div className="section-heading">
        <div>
          <h2>ファイル順序</h2>
          <p>{files.length}件、結合順をカード単位で編集中</p>
        </div>
        <div className="hint-chip">D&amp;D対応</div>
      </div>
      <div className="file-strip">
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
              draggingFileId={draggingFileId}
              dropTarget={dropTarget}
              onPointerDragStart={handlePointerDragStart}
              onPointerDragMove={handlePointerDragMove}
              onPointerDragEnd={handlePointerDragEnd}
              onPointerDragCancel={handlePointerDragCancel}
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

function decorationAppliesToPage(decoration: Decoration, page: PageItem): boolean {
  if (decoration.pageId === page.id) {
    return true;
  }
  if (decoration.target === "all") {
    return true;
  }
  return decoration.target === "selected" && page.selected && !decoration.pageId;
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
  const header = visibleDecorations.find((decoration) => decoration.kind === "header");
  const footer = visibleDecorations.find((decoration) => decoration.kind === "footer");
  const pageNumber = visibleDecorations.find(
    (decoration) => decoration.kind === "page-number",
  );
  const watermark = visibleDecorations.find(
    (decoration) => decoration.kind === "watermark",
  );

  return (
    <>
      {header && <div className="placed-header">{header.text}</div>}
      {footer && <div className="placed-footer">{footer.text}</div>}
      {pageNumber && (
        <div className={`placed-number pos-${pageNumber.position}`}>
          {pageNumber.text
            .replace("{page}", String(page.pageNumber))
            .replace("{total}", "total")}
        </div>
      )}
      {watermark && (
        <div
          className="placed-watermark"
          style={{
            opacity: watermark.opacity,
            fontSize: `${watermark.fontSize}px`,
          }}
        >
          {watermark.text}
        </div>
      )}
    </>
  );
}

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
}) {
  const activeTool = useWorkbenchStore((state) => state.activeTool);
  const selectPage = useWorkbenchStore((state) => state.selectPage);
  const togglePageExcluded = useWorkbenchStore((state) => state.togglePageExcluded);
  const togglePageSplit = useWorkbenchStore((state) => state.togglePageSplit);
  const placeDecoration = useWorkbenchStore((state) => state.placeDecoration);
  const clickGuardRef = useRef(false);

  const applyTool = (event?: React.MouseEvent) => {
    if (clickGuardRef.current) {
      return;
    }
    if (activeTool === "trash") {
      togglePageExcluded(page.id);
      return;
    }
    if (activeTool === "scissors") {
      togglePageSplit(page.id);
      return;
    }
    if (decorationToolIds.includes(activeTool as DecorationKind)) {
      placeDecoration(activeTool as DecorationKind, page.id);
      return;
    }
    selectPage(page.id, Boolean(event?.shiftKey || event?.ctrlKey || event?.metaKey));
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (activeTool !== "select" || event.button !== 0) {
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

  return (
    <button
      className={[
        "page-card",
        page.excluded ? "is-excluded" : "",
        page.selected ? "is-selected" : "",
        page.searchHit ? "has-search-hit" : "",
        draggingPageId === page.id ? "is-dragging" : "",
        dropTarget?.pageId === page.id ? `is-drop-${dropTarget.position}` : "",
      ].join(" ")}
      onClick={applyTool}
      onDragOver={(event) => onDragOver(event, page.id)}
      onDrop={(event) => onDrop(event, page.id)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      type="button"
      data-file-id={fileId}
      data-page-id={page.id}
    >
      <div className={["page-sheet", page.thumbnailPath ? "has-thumbnail" : ""].join(" ")}>
        {page.thumbnailPath && (
          <img className="page-thumbnail" src={localAssetSrc(page.thumbnailPath)} alt="" />
        )}
        <div className="header-zone">ヘッダー</div>
        <div className="page-lines">
          <span />
          <span />
          <span />
          <span />
        </div>
        <PageDecorations page={page} decorations={decorations} />
        <div className="footer-zone">ページ番号</div>
      </div>
      <div className="page-label">
        p{page.pageNumber}
        {page.excluded && <span>除外</span>}
        {page.searchHit && <span className="hit-label">検索</span>}
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
  decoration,
  onClose,
}: {
  decoration?: Decoration;
  onClose: () => void;
}) {
  const updateDecoration = useWorkbenchStore((state) => state.updateDecoration);
  const removeDecoration = useWorkbenchStore((state) => state.removeDecoration);

  if (!decoration) {
    return null;
  }

  return (
    <div className="floating-panel decoration-panel">
      <div className="floating-title">
        <span>
          <Hash size={16} />
          {decorationLabel(decoration.kind)}
        </span>
        <button className="panel-close" onClick={onClose} aria-label="設定を隠す">
          <X size={14} />
        </button>
      </div>
      <label>
        対象
        <select
          value={decoration.target}
          onChange={(event) =>
            updateDecoration(decoration.id, {
              target: event.target.value as Decoration["target"],
            })
          }
        >
          <option value="all">全ページ</option>
          <option value="selected">選択ページ</option>
          <option value="output">この出力のみ</option>
        </select>
      </label>
      <label>
        文字
        <input
          value={decoration.text}
          onChange={(event) => updateDecoration(decoration.id, { text: event.target.value })}
        />
      </label>
      <label>
        配置
        <select
          value={decoration.position}
          onChange={(event) =>
            updateDecoration(decoration.id, {
              position: event.target.value as DecorationPosition,
            })
          }
        >
          {[
            "top",
            "bottom",
            "bottom-left",
            "bottom-center",
            "bottom-right",
            "center",
          ].map((position) => (
            <option value={position} key={position}>
              {positionLabel(position as DecorationPosition)}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-controls">
        <label>
          サイズ
          <input
            type="number"
            min={8}
            max={48}
            value={decoration.fontSize}
            onChange={(event) =>
              updateDecoration(decoration.id, { fontSize: Number(event.target.value) })
            }
          />
        </label>
        <label>
          濃度
          <input
            type="number"
            min={0.1}
            max={1}
            step={0.05}
            value={decoration.opacity}
            onChange={(event) =>
              updateDecoration(decoration.id, { opacity: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <button className="panel-danger" onClick={() => removeDecoration(decoration.id)}>
        <X size={14} />
        削除
      </button>
    </div>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const searchReplace = useWorkbenchStore((state) => state.searchReplace);
  const updateSearchReplace = useWorkbenchStore((state) => state.updateSearchReplace);
  const applySearchReplace = useWorkbenchStore((state) => state.applySearchReplace);

  return (
    <div className="floating-panel tool-panel">
      <button className="panel-close panel-close-floating" onClick={onClose} aria-label="設定を隠す">
        <X size={14} />
      </button>
      <div className="floating-title">
        <FileSearch size={16} />
        検索置換
      </div>
      <label>
        検索
        <input
          value={searchReplace.query}
          onChange={(event) => updateSearchReplace({ query: event.target.value })}
        />
      </label>
      <label>
        置換
        <input
          value={searchReplace.replacement}
          onChange={(event) =>
            updateSearchReplace({ replacement: event.target.value })
          }
        />
      </label>
      <div className="panel-summary">{searchReplace.matchCount}件一致</div>
      <button onClick={applySearchReplace}>
        <CheckCircle2 size={14} />
        一括予約
      </button>
    </div>
  );
}

function SecurityPanel({ onClose }: { onClose: () => void }) {
  const security = useWorkbenchStore((state) => state.security);
  const updateSecurity = useWorkbenchStore((state) => state.updateSecurity);

  return (
    <div className="floating-panel tool-panel">
      <button className="panel-close panel-close-floating" onClick={onClose} aria-label="設定を隠す">
        <X size={14} />
      </button>
      <div className="floating-title">
        <Shield size={16} />
        鍵
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={security.outputEncrypted}
          onChange={(event) => updateSecurity({ outputEncrypted: event.target.checked })}
        />
        出力PDFを暗号化
      </label>
      <label>
        出力パスワード
        <input
          type="password"
          value={security.outputPassword ?? ""}
          onChange={(event) => updateSecurity({ outputPassword: event.target.value })}
          placeholder="未設定"
        />
      </label>
      <label>
        入力解除パスワード
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

function ExpandedTimeline() {
  const files = useWorkbenchStore((state) => state.files);
  const pagesByFile = useWorkbenchStore((state) => state.pagesByFile);
  const outputPlan = useWorkbenchStore((state) => state.outputPlan);
  const decorations = useWorkbenchStore((state) => state.decorations);
  const selectedDecorationId = useWorkbenchStore((state) => state.selectedDecorationId);
  const activeTool = useWorkbenchStore((state) => state.activeTool);
  const movePageToIndex = useWorkbenchStore((state) => state.movePageToIndex);
  const togglePageExcluded = useWorkbenchStore((state) => state.togglePageExcluded);
  const togglePageSplit = useWorkbenchStore((state) => state.togglePageSplit);
  const placeDecoration = useWorkbenchStore((state) => state.placeDecoration);
  const expandedFile = files.find((file) => file.expanded && file.cacheState === "ready");
  const pages = expandedFile ? pagesByFile[expandedFile.id] ?? [] : [];
  const activeDecoration = decorations.find(
    (decoration) => decoration.id === selectedDecorationId,
  );
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PageDropTarget | null>(null);
  const [settingsPanelHidden, setSettingsPanelHidden] = useState(false);
  const pagePointerDragRef = useRef<PagePointerDragRef | null>(null);

  useEffect(() => {
    setSettingsPanelHidden(false);
  }, [activeTool, selectedDecorationId, expandedFile?.id]);

  const positionFromEvent = (
    event: DragEvent<HTMLButtonElement>,
  ): PageDropTarget["position"] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX > rect.left + rect.width / 2 ? "after" : "before";
  };

  const pageDropTargetFromPoint = (
    clientX: number,
    clientY: number,
  ): PageDropTarget | null => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-page-id]"));
    if (cards.length === 0) {
      return null;
    }

    const hitCard = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    });
    if (!hitCard?.dataset.pageId) {
      return null;
    }

    const rect = hitCard.getBoundingClientRect();
    return {
      pageId: hitCard.dataset.pageId,
      position: clientX > rect.left + rect.width / 2 ? "after" : "before",
    };
  };

  const resetPagePointerDrag = () => {
    pagePointerDragRef.current = null;
    setDraggingPageId(null);
    setDropTarget(null);
  };

  const handlePagePointerDragStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ) => {
    pagePointerDragRef.current = {
      pageId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: null,
      active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePagePointerDragMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== event.pointerId) {
      return false;
    }

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance < 6) {
      return false;
    }

    drag.active = true;
    event.preventDefault();
    const nextTarget = pageDropTargetFromPoint(event.clientX, event.clientY);
    drag.target = nextTarget;
    setDraggingPageId(drag.pageId);
    setDropTarget(nextTarget);
    return true;
  };

  const handlePagePointerDragEnd = (
    event: React.PointerEvent<HTMLButtonElement>,
    pageId: string,
  ): boolean => {
    const drag = pagePointerDragRef.current;
    if (!drag || drag.pageId !== pageId || drag.pointerId !== event.pointerId) {
      return false;
    }

    const wasDragging = drag.active;
    const target = drag.target;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

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

  const handlePageDrop = (event: DragEvent<HTMLButtonElement>, pageId: string) => {
    event.preventDefault();
    const toolId = event.dataTransfer.getData("application/pdf-workbench-tool") as ToolId;
    if (toolId) {
      if (toolId === "trash") {
        togglePageExcluded(pageId);
      } else if (toolId === "scissors") {
        togglePageSplit(pageId);
      } else if (decorationToolIds.includes(toolId as DecorationKind)) {
        placeDecoration(toolId as DecorationKind, pageId);
      }
      setDropTarget(null);
      return;
    }

    setDraggingPageId(null);
    setDropTarget(null);
  };

  const activePanel =
    activeTool === "search-replace" ? (
      <SearchPanel onClose={() => setSettingsPanelHidden(true)} />
    ) : activeTool === "lock" ? (
      <SecurityPanel onClose={() => setSettingsPanelHidden(true)} />
    ) : activeTool === "info" ? (
      <InfoPanel file={expandedFile ?? files[0]} onClose={() => setSettingsPanelHidden(true)} />
    ) : (
      <DecorationPanel
        decoration={activeDecoration}
        onClose={() => setSettingsPanelHidden(true)}
      />
    );
  const hasActivePanel = Boolean(
    activeTool === "search-replace" ||
      activeTool === "lock" ||
      activeTool === "info" ||
      activeDecoration,
  );

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
          <span>出力 {outputPlan.outputCount}</span>
        </div>
      </div>

      <div className="page-groups">
        <div className="output-band output-one">出力 1</div>
        <div className="output-band output-two">出力 2</div>
      </div>

      <div className="page-timeline">
        {pages.length > 0 ? (
          pages.map((page) => (
            <PageCard
              page={page}
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
              key={page.id}
            />
          ))
        ) : (
          <div className="empty-timeline">ファイルカードを展開してください</div>
        )}
      </div>

      {pages.length > 0 && !settingsPanelHidden && activePanel}
      {pages.length > 0 && settingsPanelHidden && hasActivePanel && (
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
  const cancelExportJob = useWorkbenchStore((state) => state.cancelExportJob);
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
  const pendingCount = files.filter((file) =>
    ["queued", "converting", "stale"].includes(file.cacheState) &&
    !(file.sourcePath?.startsWith("sample://") || file.sourcePath?.startsWith("session://")),
  ).length;
  const progressWidth =
    exportJob.status === "running" || exportJob.status === "completed"
      ? `${exportJob.progress}%`
      : pendingCount > 0
        ? "42%"
        : "0%";

  return (
    <footer className="output-bar">
      <div className="output-plan">
        <div className="output-title">
          <BadgeInfo size={17} />
          出力予定 {outputPlan.outputCount}ファイル
        </div>
        <div className="output-files">
          {outputPlan.outputFiles.map((file) => (
            <span key={file}>{file}</span>
          ))}
          <span className="locked-chip">
            <KeyRound size={13} />
            {outputPlan.encrypted ? "暗号化あり" : "暗号化なし"}
          </span>
          <span>
            <ListChecks size={13} />
            {outputPlan.activePageCount}ページ
          </span>
        </div>
      </div>
      <div className="job-status">
        <span>
          {exportJob.status === "running"
            ? exportJob.currentStep
            : pendingCount > 0
              ? `待機 ${pendingCount}`
              : exportJob.message}
        </span>
        <div className="job-track">
          <span style={{ width: progressWidth }} />
        </div>
        {exportJob.status === "running" && (
          <button onClick={handleCancel}>
            <CircleStop size={16} />
            中止
          </button>
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

  if (!open) {
    return null;
  }

  const groups = buildExportPreviewGroups(files, pagesByFile, outputPlan);
  const pendingFiles = files.filter(
    (file) =>
      !file.excluded && ["queued", "converting", "stale"].includes(file.cacheState),
  );

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="export-preview-modal" role="dialog" aria-modal="true" aria-label="書き出しプレビュー">
        <div className="modal-heading">
          <span>
            <Eye size={18} />
            書き出しプレビュー
          </span>
          <button className="icon-button" onClick={onClose} aria-label="プレビューを閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="preview-summary-row">
          <span>{outputPlan.outputCount}ファイル</span>
          <span>{outputPlan.activePageCount}ページ</span>
          <span>除外 {outputPlan.excludedPageCount}</span>
          <span>分割 {outputPlan.splitCount}</span>
          <span>装飾 {decorations.length}</span>
          <span>{outputPlan.encrypted ? "暗号化あり" : "暗号化なし"}</span>
        </div>

        {pendingFiles.length > 0 && (
          <div className="preview-warning">
            未準備のファイルは、書き出し前にバックグラウンドでPDF化してから反映します。
          </div>
        )}

        <div className="preview-output-list">
          {groups.map((group, index) => (
            <article className="preview-output-group" key={group.name}>
              <div className="preview-output-heading">
                <strong>{group.name}</strong>
                <span>出力 {index + 1} / {group.pages.length}ページ</span>
              </div>
              <div className="preview-page-strip">
                {group.pages.length > 0 ? (
                  group.pages.map((page) => {
                    const thumbnailSrc = localAssetSrc(page.thumbnailPath);
                    return (
                      <div className="preview-page-card" key={page.id} title={page.fileName}>
                        <div className="preview-page-paper">
                          {thumbnailSrc ? (
                            <img src={thumbnailSrc} alt="" draggable={false} />
                          ) : (
                            <FileText size={26} />
                          )}
                        </div>
                        <span>
                          {kindLabel(page.fileKind)} p{page.pageNumber}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="preview-empty">出力対象ページがありません</div>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="preview-actions">
          <button onClick={onClose}>戻る</button>
          <button
            className="export-button"
            disabled={exportJob.status === "running" || outputPlan.activePageCount === 0}
            onClick={onConfirm}
          >
            <Upload size={17} />
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
          <span>{log.message}</span>
        </div>
      ))}
    </aside>
  );
}

export function App() {
  const [dropActive, setDropActive] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const addInputFiles = useWorkbenchStore((state) => state.addInputFiles);
  const addLog = useWorkbenchStore((state) => state.addLog);
  const undo = useWorkbenchStore((state) => state.undo);
  const redo = useWorkbenchStore((state) => state.redo);
  const deleteSelectedPages = useWorkbenchStore((state) => state.deleteSelectedPages);
  const setActiveTool = useWorkbenchStore((state) => state.setActiveTool);
  const setCacheSession = useWorkbenchStore((state) => state.setCacheSession);
  const cacheSession = useWorkbenchStore((state) => state.cacheSession);
  const tickBackgroundJobs = useWorkbenchStore((state) => state.tickBackgroundJobs);
  const tickExportJob = useWorkbenchStore((state) => state.tickExportJob);

  useEffect(() => {
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
      );

    return () => {
      if (sessionId) {
        cleanupCacheSession(sessionId).catch(() => undefined);
      }
    };
  }, [addLog, setCacheSession]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isTauriRuntime() && cacheSession.path) {
        processNextPendingEngineFile(cacheSession.path);
        return;
      }
      tickBackgroundJobs();
    }, 900);
    return () => window.clearInterval(timer);
  }, [cacheSession.path, tickBackgroundJobs]);

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

  return (
    <div className={["app-shell", dropActive ? "is-drop-active" : ""].join(" ")}>
      <AppBar />
      <ToolBar />
      <main
        className="workbench"
        onDragOver={handleWorkbenchDragOver}
        onDragLeave={handleWorkbenchDragLeave}
        onDrop={handleWorkbenchDrop}
      >
        <FileStrip />
        <ExpandedTimeline />
      </main>
      <OutputBar logOpen={logOpen} onToggleLog={() => setLogOpen((open) => !open)} />
      <LogDrawerPreview open={logOpen} />
    </div>
  );
}
