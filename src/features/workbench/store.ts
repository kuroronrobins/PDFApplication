import { create } from "zustand";
import { buildOutputPlan } from "./outputPlan";
import {
  initialDecorations,
  initialFiles,
  initialLogs,
  initialPagesByFile,
  initialSecurity,
} from "./sampleData";
import type {
  CacheState,
  CacheSession,
  Decoration,
  DecorationDraft,
  DecorationKind,
  DecorationPosition,
  DecorationTarget,
  ExportJobState,
  InputFileInfo,
  JobStep,
  OutputPlan,
  OutputSettings,
  PageItem,
  PdfMetadata,
  SecurityState,
  ToolId,
  WorkbenchFile,
  WorkbenchLog,
  WorkbenchSnapshot,
} from "./types";

type WorkbenchState = WorkbenchSnapshot & {
  cacheSession: CacheSession;
  exportPath?: string;
  outputSettings: OutputSettings;
  lastOutputFiles: string[];
  exportJob: ExportJobState;
  backgroundProcessingPausedUntil: number;
  logs: WorkbenchLog[];
  history: WorkbenchSnapshot[];
  future: WorkbenchSnapshot[];
  outputPlan: OutputPlan;
  canUndo: boolean;
  canRedo: boolean;
  decorationDrafts: Record<DecorationKind, DecorationDraft>;
  setActiveTool: (tool: ToolId) => void;
  loadDevelopmentFixture: () => void;
  updateDecorationDraft: (kind: DecorationKind, patch: Partial<DecorationDraft>) => void;
  setCacheSession: (session: CacheSession) => void;
  addInputFiles: (inputFiles: InputFileInfo[]) => void;
  addLog: (level: WorkbenchLog["level"], message: string) => void;
  setExportPath: (path: string) => void;
  applyOutputSettings: (destinationDir: string, outputNames: string[]) => void;
  resetOutputSettings: () => void;
  toggleFileExpanded: (fileId: string) => void;
  toggleFileExcluded: (fileId: string) => void;
  removeFile: (fileId: string) => void;
  moveFile: (fileId: string, direction: -1 | 1) => void;
  moveFileToIndex: (fileId: string, insertionIndex: number) => void;
  prioritizeFileConversion: (fileId: string) => void;
  setFileCacheProgress: (
    fileId: string,
    cacheState: CacheState,
    progress?: number,
    message?: string,
  ) => void;
  completeFileInspection: (
    fileId: string,
    payload: {
      cachePath: string;
      pageCount: number;
      metadata: PdfMetadata;
      thumbnailPaths?: Record<number, string>;
      previewPaths?: Record<number, string>;
      engineState?: WorkbenchFile["engineState"];
      message?: string;
    },
  ) => void;
  failFileProcessing: (fileId: string, message: string) => void;
  tickBackgroundJobs: () => void;
  clearSelections: () => void;
  selectFile: (fileId: string, mode?: SelectionMode) => void;
  selectPage: (pageId: string, mode?: SelectionMode) => void;
  togglePageExcluded: (pageId: string) => void;
  togglePageSplit: (pageId: string) => void;
  movePageToIndex: (pageId: string, targetFileId: string, insertionIndex: number) => void;
  deleteSelectedPages: () => void;
  placeDecoration: (
    kind: DecorationKind,
    pageId?: string,
    position?: DecorationPosition,
    fileId?: string,
  ) => void;
  applyDecorationToTarget: (
    kind: DecorationKind,
    target: { pageId?: string; fileId?: string },
  ) => void;
  updateDecoration: (decorationId: string, patch: Partial<Decoration>) => void;
  removeDecoration: (decorationId: string) => void;
  updateSecurity: (patch: Partial<SecurityState>) => void;
  startExportJob: () => void;
  setExportJobProgress: (progress: number, currentStep?: JobStep, message?: string) => void;
  completeExportJob: (outputFiles?: string[]) => void;
  failExportJob: (message: string) => void;
  tickExportJob: () => void;
  cancelExportJob: () => void;
  undo: () => void;
  redo: () => void;
};

type SelectionMode = "replace" | "toggle" | "range";

const exportSteps: JobStep[] = [
  "Office変換",
  "PDF解析",
  "結合",
  "ページ編集反映",
  "分割",
  "装飾",
  "暗号化",
  "保存",
];

function clonePages(
  pagesByFile: Record<string, PageItem[]>,
): Record<string, PageItem[]> {
  return Object.fromEntries(
    Object.entries(pagesByFile).map(([fileId, pages]) => [
      fileId,
      pages.map((page) => ({ ...page })),
    ]),
  );
}

function cloneSecurity(security: SecurityState): SecurityState {
  return { ...security };
}

function snapshotOf(state: WorkbenchSnapshot): WorkbenchSnapshot {
  return {
    files: state.files.map((file) => ({
      ...file,
      metadata: file.metadata ? { ...file.metadata } : undefined,
    })),
    pagesByFile: clonePages(state.pagesByFile),
    activeTool: state.activeTool,
    decorations: state.decorations.map((decoration) => ({ ...decoration })),
    selectedDecorationId: state.selectedDecorationId,
    security: cloneSecurity(state.security),
  };
}

const initialOutputSettings: OutputSettings = {
  applied: false,
  outputNames: [],
};

function cloneOutputSettings(outputSettings: OutputSettings): OutputSettings {
  return {
    applied: outputSettings.applied,
    destinationDir: outputSettings.destinationDir,
    outputNames: [...outputSettings.outputNames],
  };
}

function normalizeOutputSettingsForSnapshot(
  snapshot: WorkbenchSnapshot,
  outputSettings: OutputSettings,
): OutputSettings {
  return snapshot.files.length === 0
    ? cloneOutputSettings(initialOutputSettings)
    : cloneOutputSettings(outputSettings);
}

function derive(
  snapshot: WorkbenchSnapshot,
  outputSettings: OutputSettings = initialOutputSettings,
) {
  const normalizedOutputSettings = normalizeOutputSettingsForSnapshot(
    snapshot,
    outputSettings,
  );
  const outputPlan = buildOutputPlan(
    snapshot.files,
    snapshot.pagesByFile,
    snapshot.decorations,
    snapshot.security,
    normalizedOutputSettings,
  );
  return {
    ...snapshot,
    outputSettings: normalizedOutputSettings,
    outputPlan,
  };
}

function findPageFile(
  pagesByFile: Record<string, PageItem[]>,
  pageId: string,
): string | undefined {
  return Object.keys(pagesByFile).find((fileId) =>
    pagesByFile[fileId].some((page) => page.id === pageId),
  );
}

function pageOrder(pagesByFile: Record<string, PageItem[]>): PageItem[] {
  return Object.values(pagesByFile).flat();
}

function rangeIds<T extends { id: string; selected: boolean }>(
  items: T[],
  targetId: string,
): Set<string> {
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) {
    return new Set();
  }
  const selectedIndexes = items
    .map((item, index) => (item.selected ? index : -1))
    .filter((index) => index >= 0);
  if (selectedIndexes.length === 0) {
    return new Set([targetId]);
  }
  const anchorIndex = selectedIndexes.reduce((closest, index) =>
    Math.abs(index - targetIndex) < Math.abs(closest - targetIndex) ? index : closest,
  );
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return new Set(items.slice(start, end + 1).map((item) => item.id));
}

function selectedFileIdsForAction(files: WorkbenchFile[], fileId: string): string[] {
  const selectedIds = files.filter((file) => file.selected).map((file) => file.id);
  return selectedIds.includes(fileId) ? selectedIds : [fileId];
}

function selectedPageIdsForAction(
  pagesByFile: Record<string, PageItem[]>,
  pageId: string,
): string[] {
  const pages = pageOrder(pagesByFile);
  const selectedIds = pages.filter((page) => page.selected).map((page) => page.id);
  return selectedIds.includes(pageId) ? selectedIds : [pageId];
}

function clearPageSelection(
  pagesByFile: Record<string, PageItem[]>,
): Record<string, PageItem[]> {
  return Object.fromEntries(
    Object.entries(pagesByFile).map(([fileId, pages]) => [
      fileId,
      pages.map((page) => ({ ...page, selected: false })),
    ]),
  );
}

function clearAllSelections(snapshot: WorkbenchSnapshot): WorkbenchSnapshot {
  return {
    ...snapshot,
    files: snapshot.files.map((file) => ({ ...file, selected: false })),
    pagesByFile: clearPageSelection(snapshot.pagesByFile),
    selectedDecorationId: undefined,
  };
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function randomId(prefix: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function createLog(level: WorkbenchLog["level"], message: string): WorkbenchLog {
  return {
    id: randomId("log"),
    time: nowLabel(),
    level,
    message,
  };
}

function inputKey(info: InputFileInfo): string {
  return info.path || `${info.name}:${info.sizeBytes ?? "unknown"}`;
}

const inputFileCollator = new Intl.Collator("ja", {
  numeric: true,
  sensitivity: "base",
});

function sortInputFilesForInsertion(inputFiles: InputFileInfo[]): InputFileInfo[] {
  return inputFiles
    .map((info, index) => ({ info, index }))
    .sort((left, right) => {
      const nameOrder = inputFileCollator.compare(left.info.name, right.info.name);
      if (nameOrder !== 0) {
        return nameOrder;
      }
      const pathOrder = inputFileCollator.compare(left.info.path, right.info.path);
      return pathOrder !== 0 ? pathOrder : left.index - right.index;
    })
    .map((entry) => entry.info);
}

function fileKey(file: WorkbenchFile): string {
  return file.sourcePath || `${file.name}:${file.sizeBytes ?? "unknown"}`;
}

function isVirtualSource(path?: string): boolean {
  return Boolean(
    path?.startsWith("sample://") ||
      path?.startsWith("browser://") ||
      path?.startsWith("session://"),
  );
}

function createFileId(info: InputFileInfo, index: number): string {
  const stem = info.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-");
  const safeStem = stem || "file";
  return `${safeStem}-${Date.now().toString(36)}-${index}`;
}

function estimatePageCount(file: Pick<WorkbenchFile, "kind" | "sizeBytes">): number {
  const sizeBased = Math.ceil((file.sizeBytes ?? 360_000) / 120_000);
  const defaultByKind = {
    pdf: 4,
    excel: 8,
    word: 6,
    powerpoint: 12,
  }[file.kind];
  return Math.max(1, Math.min(24, Math.max(defaultByKind, sizeBased)));
}

function createPages(
  fileId: string,
  pageCount: number,
  sourceFileId = fileId,
  thumbnailPaths: Record<number, string> = {},
  previewPaths: Record<number, string> = {},
): PageItem[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `${fileId}-p${index + 1}`,
    fileId,
    sourceFileId,
    pageNumber: index + 1,
    originalPageNumber: index + 1,
    thumbnailPath: thumbnailPaths[index + 1],
    previewPath: previewPaths[index + 1],
    excluded: false,
    selected: false,
    splitAfter: false,
  }));
}

function renumberPages(pages: PageItem[], fileId: string): PageItem[] {
  return pages.map((page, index) => ({
    ...page,
    fileId,
    sourceFileId: page.sourceFileId ?? fileId,
    pageNumber: index + 1,
  }));
}

function defaultDecorationText(kind: DecorationKind): string {
  switch (kind) {
    case "header":
      return "社外秘";
    case "footer":
      return "PDF Workbench";
    case "page-number":
      return "{page} / {total}";
    case "watermark":
      return "CONFIDENTIAL";
  }
}

function defaultDecorationPosition(kind: DecorationKind): DecorationPosition {
  switch (kind) {
    case "header":
      return "top";
    case "footer":
      return "bottom";
    case "page-number":
      return "bottom-right";
    case "watermark":
      return "center";
  }
}

function defaultDecorationColor(kind: DecorationKind): string {
  return kind === "watermark" ? "#d56a6a" : "#111111";
}

function defaultDecorationFontSize(kind: DecorationKind): number {
  return kind === "watermark" ? 24 : 8.5;
}

function createDecorationDrafts(): Record<DecorationKind, DecorationDraft> {
  return {
    header: {
      text: defaultDecorationText("header"),
      position: defaultDecorationPosition("header"),
      color: defaultDecorationColor("header"),
      fontSize: defaultDecorationFontSize("header"),
    },
    footer: {
      text: defaultDecorationText("footer"),
      position: defaultDecorationPosition("footer"),
      color: defaultDecorationColor("footer"),
      fontSize: defaultDecorationFontSize("footer"),
    },
    "page-number": {
      text: defaultDecorationText("page-number"),
      position: defaultDecorationPosition("page-number"),
      color: defaultDecorationColor("page-number"),
      fontSize: defaultDecorationFontSize("page-number"),
    },
    watermark: {
      text: defaultDecorationText("watermark"),
      position: defaultDecorationPosition("watermark"),
      color: defaultDecorationColor("watermark"),
      fontSize: defaultDecorationFontSize("watermark"),
    },
  };
}

function colorOf(decoration: Decoration): string {
  return decoration.color ?? defaultDecorationColor(decoration.kind);
}

function exactDecorationMatchesDraft(
  decoration: Decoration,
  kind: DecorationKind,
  draft: DecorationDraft,
): boolean {
  return (
    decoration.kind === kind &&
    decoration.position === draft.position &&
    decoration.text === draft.text &&
    colorOf(decoration).toLowerCase() === draft.color.toLowerCase()
  );
}

function sameDecorationSlot(
  decoration: Decoration,
  kind: DecorationKind,
  position: DecorationPosition,
): boolean {
  if (kind === "watermark" || decoration.kind === "watermark") {
    return decoration.kind === "watermark" && kind === "watermark";
  }
  const requestedBand = kind === "header" ? "header" : "footer";
  const decorationBand = decoration.kind === "header" ? "header" : "footer";
  if (requestedBand !== decorationBand) {
    return false;
  }
  return decorationSlotKey(decoration.position) === decorationSlotKey(position);
}

function decorationSlotKey(position: DecorationPosition): "left" | "center" | "right" {
  if (position.endsWith("-left")) {
    return "left";
  }
  if (position.endsWith("-right")) {
    return "right";
  }
  return "center";
}

function createDecorationFromDraft(
  kind: DecorationKind,
  draft: DecorationDraft,
  pageId?: string,
  fileId?: string,
): Decoration {
  return {
    id: randomId("decoration"),
    kind,
    text: draft.text,
    target: defaultDecorationTarget(pageId, fileId),
    position: kind === "watermark" ? "center" : draft.position,
    pageId,
    fileId,
    excludedPageIds: [],
    fontSize: draft.fontSize,
    opacity: 1,
    color: draft.color,
  };
}

function defaultDecorationTarget(pageId?: string, fileId?: string): DecorationTarget {
  if (pageId) {
    return "selected";
  }
  if (fileId) {
    return "file";
  }
  return "all";
}

function commitSnapshot(
  set: (state: Partial<WorkbenchState>) => void,
  current: WorkbenchState,
  nextSnapshot: WorkbenchSnapshot,
  extra?: Partial<WorkbenchState>,
) {
  const previous = snapshotOf(current);
  const next = derive(nextSnapshot, extra?.outputSettings ?? current.outputSettings);
  set({
    ...next,
    ...extra,
    history: [...current.history, previous],
    future: [],
    canUndo: true,
    canRedo: false,
  });
}

const initialSnapshot: WorkbenchSnapshot = {
  files: [],
  pagesByFile: {},
  activeTool: "select",
  decorations: [],
  selectedDecorationId: undefined,
  security: {
    inputPasswordRequired: false,
    outputEncrypted: false,
  },
};

const initialExportJob: ExportJobState = {
  status: "idle",
  progress: 0,
  cancellable: false,
  message: "準備完了",
};

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  ...derive(snapshotOf(initialSnapshot), initialOutputSettings),
  cacheSession: {
    id: randomId("session"),
    initialized: false,
  },
  exportJob: initialExportJob,
  backgroundProcessingPausedUntil: 0,
  lastOutputFiles: [],
  logs: [],
  history: [],
  future: [],
  canUndo: false,
  canRedo: false,
  decorationDrafts: createDecorationDrafts(),

  setActiveTool: (tool) => {
    const current = get();
    set(
      derive(
        clearAllSelections({
          files: current.files.map((file) => ({ ...file })),
          pagesByFile: clonePages(current.pagesByFile),
          activeTool: tool,
          decorations: current.decorations.map((decoration) => ({ ...decoration })),
          selectedDecorationId: current.selectedDecorationId,
          security: cloneSecurity(current.security),
        }),
        current.outputSettings,
      ),
    );
  },

  loadDevelopmentFixture: () => {
    const snapshot: WorkbenchSnapshot = {
      files: initialFiles.map((file) => ({
        ...file,
        metadata: file.metadata ? { ...file.metadata } : undefined,
      })),
      pagesByFile: clonePages(initialPagesByFile),
      activeTool: "select",
      decorations: initialDecorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: initialDecorations[0]?.id,
      security: cloneSecurity(initialSecurity),
    };
    set({
      ...derive(snapshot, initialOutputSettings),
      logs: initialLogs.map((log) => ({ ...log })),
      lastOutputFiles: [],
      history: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  updateDecorationDraft: (kind, patch) => {
    const current = get();
    set({
      decorationDrafts: {
        ...current.decorationDrafts,
        [kind]: {
          ...current.decorationDrafts[kind],
          ...patch,
        },
      },
    });
  },

  setCacheSession: (session) => {
    set((state) => ({
      cacheSession: session,
      logs: [
        createLog(
          "info",
          session.path
            ? `セッション一時キャッシュを準備しました: ${session.path}`
            : "セッション一時キャッシュを準備しました。",
        ),
        ...state.logs,
      ],
    }));
  },

  addInputFiles: (inputFiles) => {
    if (inputFiles.length === 0) {
      return;
    }
    const sortedInputFiles = sortInputFilesForInsertion(inputFiles);

    const current = get();
    const incomingRealFiles = sortedInputFiles.some(
      (info) => info.kind !== "unsupported" && !isVirtualSource(info.path),
    );
    const replaceSampleWorkspace =
      incomingRealFiles &&
      current.files.length > 0 &&
      current.files.every((file) => isVirtualSource(file.sourcePath));
    const files = replaceSampleWorkspace
      ? []
      : current.files.map((file) => ({
          ...file,
          metadata: file.metadata ? { ...file.metadata } : undefined,
        }));
    const pagesByFile = replaceSampleWorkspace ? {} : clonePages(current.pagesByFile);
    const logs = [...current.logs];
    const existingKeys = new Set(files.map(fileKey));
    let addedCount = 0;

    sortedInputFiles.forEach((info) => {
      const key = inputKey(info);

      if (info.kind === "unsupported") {
        logs.unshift(
          createLog(
            "warn",
            `${info.name} は対応していない形式のため追加しませんでした。`,
          ),
        );
        return;
      }

      if (existingKeys.has(key)) {
        logs.unshift(createLog("info", `${info.name} はすでに追加済みです。`));
        return;
      }

      existingKeys.add(key);
      const id = createFileId(info, files.length + addedCount);
      const pageCount =
        info.kind === "pdf" ? estimatePageCount({ kind: info.kind, sizeBytes: info.sizeBytes }) : 0;
      files.push({
        id,
        sourcePath: info.path,
        cachePath: info.kind === "pdf" ? info.path : undefined,
        name: info.name,
        kind: info.kind,
        extension: info.extension || undefined,
        sizeBytes: info.sizeBytes,
        pageCount,
        cacheState: info.kind === "pdf" ? "ready" : "queued",
        progress: info.kind === "pdf" ? 100 : undefined,
        expanded: false,
        excluded: false,
        selected: false,
        engineState: info.kind === "pdf" ? "synthetic" : undefined,
        metadata: {
          encrypted: false,
          title: info.name.replace(/\.[^.]+$/, ""),
          pageSizeLabel: "A4",
        },
      });
      pagesByFile[id] = pageCount > 0 ? createPages(id, pageCount) : [];
      addedCount += 1;

      const message =
        info.kind === "pdf"
          ? `${info.name} を追加しました。PDF解析をバックグラウンドで実データ化します。`
          : `${info.name} を追加しました。PDF 化はバックグラウンドで待機します。`;
      logs.unshift(createLog("info", message));
    });

    if (replaceSampleWorkspace && addedCount > 0) {
      logs.unshift(createLog("info", "実ファイル追加に合わせてサンプルワークスペースをクリアしました。"));
    }

    if (addedCount === 0) {
      set({ logs });
      return;
    }

    commitSnapshot(
      set,
      current,
      {
        files,
        pagesByFile,
        activeTool: current.activeTool,
        decorations: replaceSampleWorkspace
          ? []
          : current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: replaceSampleWorkspace ? undefined : current.selectedDecorationId,
        security: cloneSecurity(current.security),
      },
      {
        logs,
        backgroundProcessingPausedUntil: Date.now() + 1200,
        outputSettings: replaceSampleWorkspace
          ? cloneOutputSettings(initialOutputSettings)
          : current.outputSettings,
      },
    );
  },

  addLog: (level, message) => {
    set((state) => ({
      logs: [createLog(level, message), ...state.logs],
    }));
  },

  setExportPath: (path) => {
    set((state) => ({
      exportPath: path,
      lastOutputFiles: [],
      logs: [createLog("info", `出力先を設定しました: ${path}`), ...state.logs],
    }));
  },

  applyOutputSettings: (destinationDir, outputNames) => {
    const current = get();
    const outputSettings: OutputSettings = {
      applied: true,
      destinationDir,
      outputNames: [...outputNames],
    };
    set({
      outputSettings,
      outputPlan: buildOutputPlan(
        current.files,
        current.pagesByFile,
        current.decorations,
        current.security,
        outputSettings,
      ),
      lastOutputFiles: [],
      logs: [
        createLog("info", `出力名と保存先を設定しました: ${destinationDir}`),
        ...current.logs,
      ],
    });
  },

  resetOutputSettings: () => {
    const current = get();
    const outputSettings = cloneOutputSettings(initialOutputSettings);
    set({
      outputSettings,
      outputPlan: buildOutputPlan(
        current.files,
        current.pagesByFile,
        current.decorations,
        current.security,
        outputSettings,
      ),
      lastOutputFiles: [],
      logs: [createLog("info", "出力名と保存先の設定を自動生成へ戻しました。"), ...current.logs],
    });
  },

  toggleFileExpanded: (fileId) => {
    const current = get();
    const target = current.files.find((file) => file.id === fileId);
    if (!target) {
      return;
    }

    if (target.cacheState !== "ready") {
      get().prioritizeFileConversion(fileId);
      return;
    }

    const pagesByFile = clonePages(current.pagesByFile);
    if ((pagesByFile[fileId] ?? []).length === 0) {
      pagesByFile[fileId] = createPages(fileId, target.pageCount || estimatePageCount(target));
    }

    const nextExpanded = !target.expanded;
    const files = current.files.map((file) =>
      file.id === fileId
        ? { ...file, expanded: nextExpanded }
        : { ...file, expanded: false },
    );
    commitSnapshot(set, current, {
      files,
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  toggleFileExcluded: (fileId) => {
    const current = get();
    const files = current.files.map((file) =>
      file.id === fileId ? { ...file, excluded: !file.excluded } : { ...file },
    );
    commitSnapshot(set, current, {
      files,
      pagesByFile: clonePages(current.pagesByFile),
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  removeFile: (fileId) => {
    const current = get();
    const targetFileIds = selectedFileIdsForAction(current.files, fileId);
    const targetFileIdSet = new Set(targetFileIds);
    const targets = current.files.filter((file) => targetFileIdSet.has(file.id));
    if (targets.length === 0) {
      return;
    }

    const removedPages = targetFileIds.flatMap((targetId) => current.pagesByFile[targetId] ?? []);
    const removedPageIds = new Set(removedPages.map((page) => page.id));
    const pagesByFile = clonePages(current.pagesByFile);
    for (const targetId of targetFileIds) {
      delete pagesByFile[targetId];
    }

    const files = current.files
      .filter((file) => !targetFileIdSet.has(file.id))
      .map((file) => ({ ...file }));
    const decorations = current.decorations
      .filter(
        (decoration) =>
          (!decoration.fileId || !targetFileIdSet.has(decoration.fileId)) &&
          (!decoration.pageId || !removedPageIds.has(decoration.pageId)),
      )
      .map((decoration) => ({ ...decoration }));

    commitSnapshot(
      set,
      current,
      {
        files,
        pagesByFile,
        activeTool: current.activeTool,
        decorations,
        selectedDecorationId: decorations.some(
          (decoration) => decoration.id === current.selectedDecorationId,
        )
          ? current.selectedDecorationId
          : undefined,
        security: cloneSecurity(current.security),
      },
      {
        logs: [
          createLog("info", targets.map((file) => file.name).join(", ") + " removed from workspace."),
          ...current.logs,
        ],
      },
    );
  },

  moveFile: (fileId, direction) => {
    const current = get();
    const index = current.files.findIndex((file) => file.id === fileId);
    if (index < 0) {
      return;
    }

    const insertionIndex = direction > 0 ? index + 2 : index - 1;
    get().moveFileToIndex(fileId, insertionIndex);
  },

  moveFileToIndex: (fileId, insertionIndex) => {
    const current = get();
    const fromIndex = current.files.findIndex((file) => file.id === fileId);
    if (fromIndex < 0) {
      return;
    }

    const movingIds = selectedFileIdsForAction(current.files, fileId);
    const movingIdSet = new Set(movingIds);
    const clampedInsertionIndex = Math.max(
      0,
      Math.min(insertionIndex, current.files.length),
    );
    const insertIndex = current.files
      .slice(0, clampedInsertionIndex)
      .filter((file) => !movingIdSet.has(file.id)).length;
    const movingFiles = current.files
      .filter((file) => movingIdSet.has(file.id))
      .map((file) => ({ ...file }));
    const remainingFiles = current.files
      .filter((file) => !movingIdSet.has(file.id))
      .map((file) => ({ ...file }));
    const files = [
      ...remainingFiles.slice(0, insertIndex),
      ...movingFiles,
      ...remainingFiles.slice(insertIndex),
    ];

    if (files.map((file) => file.id).join("\0") === current.files.map((file) => file.id).join("\0")) {
      return;
    }

    commitSnapshot(set, current, {
      files,
      pagesByFile: clonePages(current.pagesByFile),
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  prioritizeFileConversion: (fileId) => {
    const current = get();
    const files = current.files.map((file) =>
      file.id === fileId ? { ...file, priority: true } : { ...file },
    );
    const target = current.files.find((file) => file.id === fileId);
    set({
      files,
      logs: target
        ? [
            createLog("info", `${target.name} の PDF 化を優先キューに入れました。`),
            ...current.logs,
          ]
        : current.logs,
    });
  },

  setFileCacheProgress: (fileId, cacheState, progress, message) => {
    const current = get();
    const files = current.files.map((file) =>
      file.id === fileId
        ? {
            ...file,
            cacheState,
            progress,
            errorMessage: undefined,
          }
        : { ...file },
    );
    set({
      ...derive({
        files,
        pagesByFile: clonePages(current.pagesByFile),
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security: cloneSecurity(current.security),
      }, current.outputSettings),
      logs: message ? [createLog("info", message), ...current.logs] : current.logs,
    });
  },

  completeFileInspection: (fileId, payload) => {
    const current = get();
    const target = current.files.find((file) => file.id === fileId);
    if (!target) {
      return;
    }

    const pagesByFile = clonePages(current.pagesByFile);
    pagesByFile[fileId] = createPages(
      fileId,
      payload.pageCount,
      fileId,
      payload.thumbnailPaths,
      payload.previewPaths,
    );

    const files = current.files.map((file) =>
      file.id === fileId
        ? {
            ...file,
            cachePath: payload.cachePath,
            pageCount: payload.pageCount,
            cacheState: "ready" as const,
            progress: 100,
            priority: false,
            engineState: payload.engineState ?? "inspected",
            errorMessage: undefined,
            metadata: { ...payload.metadata },
          }
        : { ...file },
    );

    set({
      ...derive({
        files,
        pagesByFile,
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security: cloneSecurity(current.security),
      }, current.outputSettings),
      logs: [
        createLog(
          "info",
          payload.message ?? `${target.name} のPDF解析が完了しました。${payload.pageCount}ページ。`,
        ),
        ...current.logs,
      ],
    });
  },

  failFileProcessing: (fileId, message) => {
    const current = get();
    const files = current.files.map((file) =>
      file.id === fileId
        ? {
            ...file,
            cacheState: "error" as const,
            progress: undefined,
            priority: false,
            errorMessage: message,
          }
        : { ...file },
    );
    const target = current.files.find((file) => file.id === fileId);
    set({
      ...derive({
        files,
        pagesByFile: clonePages(current.pagesByFile),
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security: cloneSecurity(current.security),
      }, current.outputSettings),
      logs: [
        createLog("error", `${target?.name ?? fileId} の処理に失敗しました: ${message}`),
        ...current.logs,
      ],
    });
  },

  tickBackgroundJobs: () => {
    const current = get();
    const files = current.files.map((file) => ({ ...file }));
    const pagesByFile = clonePages(current.pagesByFile);
    const logs = [...current.logs];
    let changed = false;
    let convertingIndex = files.findIndex((file) => file.cacheState === "converting");

    if (convertingIndex < 0) {
      const queuedPriorityIndex = files.findIndex(
        (file) => file.cacheState === "queued" && file.priority,
      );
      const queuedIndex = files.findIndex((file) => file.cacheState === "queued");
      convertingIndex = queuedPriorityIndex >= 0 ? queuedPriorityIndex : queuedIndex;
      if (convertingIndex >= 0) {
        files[convertingIndex] = {
          ...files[convertingIndex],
          cacheState: "converting",
          progress: 6,
        };
        logs.unshift(createLog("info", `${files[convertingIndex].name} の PDF 化を開始しました。`));
        changed = true;
      }
    } else {
      const file = files[convertingIndex];
      const nextProgress = Math.min(100, (file.progress ?? 0) + 14);
      if (nextProgress >= 100) {
        const pageCount = file.pageCount || estimatePageCount(file);
        files[convertingIndex] = {
          ...file,
          cacheState: "ready",
          progress: 100,
          priority: false,
          pageCount,
          cachePath: `session://${file.id}.pdf`,
          metadata: {
            encrypted: false,
            title: file.name.replace(/\.[^.]+$/, ""),
            author: "Converted by PDF Workbench",
            pageSizeLabel: file.kind === "powerpoint" ? "16:9" : "A4",
          },
        };
        pagesByFile[file.id] = createPages(file.id, pageCount);
        logs.unshift(createLog("info", `${file.name} の一時 PDF キャッシュが完了しました。`));
      } else {
        files[convertingIndex] = {
          ...file,
          progress: nextProgress,
        };
      }
      changed = true;
    }

    if (!changed) {
      return;
    }

    set({
      ...derive({
        files,
        pagesByFile,
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security: cloneSecurity(current.security),
      }, current.outputSettings),
      logs,
    });
  },

  clearSelections: () => {
    const current = get();
    set(
      derive(
        clearAllSelections({
          files: current.files.map((file) => ({ ...file })),
          pagesByFile: clonePages(current.pagesByFile),
          activeTool: current.activeTool,
          decorations: current.decorations.map((decoration) => ({ ...decoration })),
          selectedDecorationId: current.selectedDecorationId,
          security: cloneSecurity(current.security),
        }),
        current.outputSettings,
      ),
    );
  },

  selectFile: (fileId, mode = "replace") => {
    const current = get();
    const selectedRangeIds = mode === "range" ? rangeIds(current.files, fileId) : new Set([fileId]);
    const files = current.files.map((file) => {
      if (mode === "toggle" && file.id === fileId) {
        return { ...file, selected: !file.selected };
      }
      if (mode === "range") {
        return { ...file, selected: selectedRangeIds.has(file.id) };
      }
      return { ...file, selected: file.id === fileId };
    });
    set(
      derive({
        files,
        pagesByFile: clearPageSelection(current.pagesByFile),
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security: cloneSecurity(current.security),
      }, current.outputSettings),
    );
  },

  selectPage: (pageId, mode = "replace") => {
    const current = get();
    const orderedPages = pageOrder(current.pagesByFile);
    const selectedRangeIds = mode === "range" ? rangeIds(orderedPages, pageId) : new Set([pageId]);
    const pagesByFile = clonePages(current.pagesByFile);
    for (const pages of Object.values(pagesByFile)) {
      for (const page of pages) {
        if (mode === "toggle" && page.id === pageId) {
          page.selected = !page.selected;
        } else if (mode === "range") {
          page.selected = selectedRangeIds.has(page.id);
        } else {
          page.selected = page.id === pageId;
        }
      }
    }
    set(
      derive({
        files: current.files.map((file) => ({ ...file, selected: false })),
        pagesByFile,
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security: cloneSecurity(current.security),
      }, current.outputSettings),
    );
  },

  togglePageExcluded: (pageId) => {
    const current = get();
    const targetPageIds = selectedPageIdsForAction(current.pagesByFile, pageId);
    if (targetPageIds.length === 0) {
      return;
    }
    const targetPageIdSet = new Set(targetPageIds);
    const allTargets = pageOrder(current.pagesByFile).filter((page) =>
      targetPageIdSet.has(page.id),
    );
    const nextExcluded = !allTargets.every((page) => page.excluded);
    const pagesByFile = clonePages(current.pagesByFile);
    for (const [fileId, pages] of Object.entries(pagesByFile)) {
      pagesByFile[fileId] = pages.map((page) =>
        targetPageIdSet.has(page.id) ? { ...page, excluded: nextExcluded } : page,
      );
    }
    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  togglePageSplit: (pageId) => {
    const current = get();
    const targetPageIds = selectedPageIdsForAction(current.pagesByFile, pageId);
    if (targetPageIds.length === 0) {
      return;
    }
    const targetPageIdSet = new Set(targetPageIds);
    const allTargets = pageOrder(current.pagesByFile).filter((page) =>
      targetPageIdSet.has(page.id),
    );
    const nextSplit = !allTargets.every((page) => page.splitAfter);
    const pagesByFile = clonePages(current.pagesByFile);
    for (const [fileId, pages] of Object.entries(pagesByFile)) {
      pagesByFile[fileId] = pages.map((page) =>
        targetPageIdSet.has(page.id) ? { ...page, splitAfter: nextSplit } : page,
      );
    }
    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  movePageToIndex: (pageId, targetFileId, insertionIndex) => {
    const current = get();
    const sourceFileId = findPageFile(current.pagesByFile, pageId);
    if (!sourceFileId || !current.pagesByFile[targetFileId]) {
      return;
    }

    const movingIds = selectedPageIdsForAction(current.pagesByFile, pageId);
    const movingIdSet = new Set(movingIds);
    const pagesByFile = clonePages(current.pagesByFile);
    const movingPages = current.files.flatMap((file) =>
      (pagesByFile[file.id] ?? []).filter((page) => movingIdSet.has(page.id)),
    );
    if (movingPages.length === 0) {
      return;
    }

    for (const fileId of Object.keys(pagesByFile)) {
      pagesByFile[fileId] = pagesByFile[fileId].filter((page) => !movingIdSet.has(page.id));
    }
    const originalTargetPages = current.pagesByFile[targetFileId] ?? [];
    const adjustedIndex = originalTargetPages
      .slice(0, insertionIndex)
      .filter((page) => !movingIdSet.has(page.id)).length;
    const targetPages = pagesByFile[targetFileId] ?? [];
    const clampedIndex = Math.max(0, Math.min(adjustedIndex, targetPages.length));
    targetPages.splice(
      clampedIndex,
      0,
      ...movingPages.map((page) => ({
        ...page,
        fileId: targetFileId,
        sourceFileId: page.sourceFileId ?? sourceFileId,
      })),
    );
    pagesByFile[targetFileId] = targetPages;

    for (const fileId of Object.keys(pagesByFile)) {
      pagesByFile[fileId] = renumberPages(pagesByFile[fileId], fileId);
    }

    const files = current.files.map((file) => ({
      ...file,
      pageCount: pagesByFile[file.id]?.length ?? file.pageCount,
    }));

    commitSnapshot(set, current, {
      files,
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  deleteSelectedPages: () => {
    const current = get();
    const pagesByFile = clonePages(current.pagesByFile);
    let changed = false;

    for (const [fileId, pages] of Object.entries(pagesByFile)) {
      pagesByFile[fileId] = pages.map((page) => {
        if (!page.selected || page.excluded) {
          return page;
        }
        changed = true;
        return { ...page, excluded: true };
      });
    }

    if (!changed) {
      return;
    }

    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },

  placeDecoration: (kind, pageId, position, fileId) => {
    const current = get();
    const draft: DecorationDraft = {
      ...current.decorationDrafts[kind],
      position: position ?? current.decorationDrafts[kind].position,
    };
    const decoration = createDecorationFromDraft(kind, draft, pageId, fileId);
    commitSnapshot(
      set,
      current,
      {
        files: current.files.map((file) => ({ ...file })),
        pagesByFile: clonePages(current.pagesByFile),
        activeTool: current.activeTool,
        decorations: [...current.decorations.map((item) => ({ ...item })), decoration],
        selectedDecorationId: decoration.id,
        security: cloneSecurity(current.security),
      },
      {
        logs: [
          createLog("info", `${draft.text} をページへ配置しました。`),
          ...current.logs,
        ],
      },
    );
  },

  applyDecorationToTarget: (kind, target) => {
    const current = get();
    const draft = {
      ...current.decorationDrafts[kind],
      position: kind === "watermark" ? ("center" as const) : current.decorationDrafts[kind].position,
    };
    const { pageId, fileId } = target;
    if (fileId) {
      const targetFileIds = selectedFileIdsForAction(current.files, fileId);
      if (targetFileIds.length > 1) {
        const targetFileIdSet = new Set(targetFileIds);
        const existingFileDecorations = current.decorations.filter(
          (decoration) =>
            decoration.fileId &&
            targetFileIdSet.has(decoration.fileId) &&
            !decoration.pageId &&
            sameDecorationSlot(decoration, kind, draft.position),
        );
        const exactFileDecorations = existingFileDecorations.filter((decoration) =>
          exactDecorationMatchesDraft(decoration, kind, draft),
        );
        const removeAll = targetFileIds.every((targetId) =>
          exactFileDecorations.some((decoration) => decoration.fileId === targetId),
        );
        const decorations = current.decorations
          .filter((decoration) => {
            return !existingFileDecorations.some((item) => item.id === decoration.id);
          })
          .map((decoration) => ({ ...decoration }));

        let selectedDecorationId = current.selectedDecorationId;
        if (removeAll) {
          selectedDecorationId = decorations.some(
            (decoration) => decoration.id === current.selectedDecorationId,
          )
            ? current.selectedDecorationId
            : undefined;
        } else {
          for (const targetId of targetFileIds) {
            if (existingFileDecorations.some((decoration) => decoration.fileId === targetId)) {
              continue;
            }
            const decoration = createDecorationFromDraft(kind, draft, undefined, targetId);
            decorations.push(decoration);
            selectedDecorationId = decoration.id;
          }
        }

        commitSnapshot(
          set,
          current,
          {
            files: current.files.map((file) => ({ ...file })),
            pagesByFile: clonePages(current.pagesByFile),
            activeTool: current.activeTool,
            decorations,
            selectedDecorationId,
            security: cloneSecurity(current.security),
          },
          {
            logs: [
              createLog(
                "info",
                `${draft.text} ${removeAll ? "removed from" : "applied to"} ${targetFileIds.length} files.`,
              ),
              ...current.logs,
            ],
          },
        );
        return;
      }
    }
    if (pageId) {
      const targetPageIds = selectedPageIdsForAction(current.pagesByFile, pageId);
      if (targetPageIds.length > 1) {
        const targetPageIdSet = new Set(targetPageIds);
        const pageFileById = new Map(
          Object.entries(current.pagesByFile).flatMap(([entryFileId, pages]) =>
            pages.map((page) => [page.id, entryFileId] as const),
          ),
        );
        const decorations = current.decorations.map((decoration) => ({ ...decoration }));
        const handledByFileDecoration = new Set<string>();

        for (const decoration of decorations) {
          if (
            decoration.pageId ||
            !sameDecorationSlot(decoration, kind, draft.position)
          ) {
            continue;
          }
          const scopedPageIds =
            decoration.target === "all"
              ? targetPageIds
              : decoration.target === "file" && decoration.fileId
                ? targetPageIds.filter((targetId) => pageFileById.get(targetId) === decoration.fileId)
                : [];
          if (scopedPageIds.length === 0) {
            continue;
          }
          const excludedPageIds = new Set(decoration.excludedPageIds ?? []);
          const isExactFileDecoration = exactDecorationMatchesDraft(decoration, kind, draft);
          const reapply =
            isExactFileDecoration &&
            scopedPageIds.every((targetId) => excludedPageIds.has(targetId));
          for (const targetId of scopedPageIds) {
            if (reapply) {
              excludedPageIds.delete(targetId);
              handledByFileDecoration.add(targetId);
            } else if (isExactFileDecoration) {
              excludedPageIds.add(targetId);
              handledByFileDecoration.add(targetId);
            } else {
              excludedPageIds.add(targetId);
            }
          }
          decoration.excludedPageIds = Array.from(excludedPageIds);
        }

        const remainingPageIds = targetPageIds.filter(
          (targetId) => !handledByFileDecoration.has(targetId),
        );
        const existingPageDecorations = decorations.filter(
          (decoration) =>
            decoration.pageId &&
            remainingPageIds.includes(decoration.pageId) &&
            sameDecorationSlot(decoration, kind, draft.position),
        );
        const exactPageDecorations = existingPageDecorations.filter((decoration) =>
          exactDecorationMatchesDraft(decoration, kind, draft),
        );
        const removePageScoped =
          remainingPageIds.length > 0 &&
          remainingPageIds.every((targetId) =>
            exactPageDecorations.some((decoration) => decoration.pageId === targetId),
          );
        const nextDecorations = decorations.filter(
          (decoration) => !existingPageDecorations.some((item) => item.id === decoration.id),
        );
        if (!removePageScoped) {
          for (const targetId of remainingPageIds) {
            nextDecorations.push(createDecorationFromDraft(kind, draft, targetId));
          }
        }

        commitSnapshot(
          set,
          current,
          {
            files: current.files.map((file) => ({ ...file })),
            pagesByFile: clonePages(current.pagesByFile),
            activeTool: current.activeTool,
            decorations: nextDecorations,
            selectedDecorationId:
              nextDecorations[nextDecorations.length - 1]?.id ?? current.selectedDecorationId,
            security: cloneSecurity(current.security),
          },
          {
            logs: [
              createLog("info", `${draft.text} applied/toggled on ${targetPageIds.length} pages.`),
              ...current.logs,
            ],
          },
        );
        return;
      }
    }
    let baseDecorations = current.decorations.map((decoration) => ({ ...decoration }));
    if (pageId) {
      const pageFileId = findPageFile(current.pagesByFile, pageId);
      const pageScopedSameSlot = current.decorations.some(
        (decoration) =>
          decoration.pageId === pageId &&
          sameDecorationSlot(decoration, kind, draft.position),
      );
      const broadScopedSameSlot = current.decorations.filter(
        (decoration) =>
          !decoration.pageId &&
          (decoration.target === "all" ||
            (decoration.target === "file" && decoration.fileId === pageFileId)) &&
          sameDecorationSlot(decoration, kind, draft.position),
      );
      const fileScopedDecoration = broadScopedSameSlot.find((decoration) =>
        exactDecorationMatchesDraft(decoration, kind, draft),
      );
      if (
        fileScopedDecoration &&
        broadScopedSameSlot.length === 1 &&
        !pageScopedSameSlot
      ) {
        const excludedPageIds = new Set(fileScopedDecoration.excludedPageIds ?? []);
        const excluded = excludedPageIds.has(pageId);
        if (excluded) {
          excludedPageIds.delete(pageId);
        } else {
          excludedPageIds.add(pageId);
        }
        const decorations = current.decorations.map((decoration) =>
          decoration.id === fileScopedDecoration.id
            ? { ...decoration, excludedPageIds: Array.from(excludedPageIds) }
            : { ...decoration },
        );
        commitSnapshot(
          set,
          current,
          {
            files: current.files.map((file) => ({ ...file })),
            pagesByFile: clonePages(current.pagesByFile),
            activeTool: current.activeTool,
            decorations,
            selectedDecorationId: fileScopedDecoration.id,
            security: cloneSecurity(current.security),
          },
          {
            logs: [
              createLog(
                "info",
                excluded
                  ? `${draft.text} をこのページへ再適用しました。`
                  : `${draft.text} をこのページだけ一括適用から外しました。`,
              ),
              ...current.logs,
            ],
          },
        );
        return;
      }
      if (pageFileId) {
        baseDecorations = baseDecorations.map((decoration) => {
          if (
            decoration.pageId ||
            !(decoration.target === "all" ||
              (decoration.target === "file" && decoration.fileId === pageFileId)) ||
            !sameDecorationSlot(decoration, kind, draft.position) ||
            exactDecorationMatchesDraft(decoration, kind, draft)
          ) {
            return decoration;
          }
          const excludedPageIds = new Set(decoration.excludedPageIds ?? []);
          excludedPageIds.add(pageId);
          return { ...decoration, excludedPageIds: Array.from(excludedPageIds) };
        });
      }
    }
    let scopedDecorations = baseDecorations.filter((decoration) => {
      if (!sameDecorationSlot(decoration, kind, draft.position)) {
        return false;
      }
      if (pageId) {
        return decoration.pageId === pageId;
      }
      if (fileId) {
        return decoration.fileId === fileId;
      }
      return false;
    });
    if (fileId && scopedDecorations.length === 0) {
      const pages = current.pagesByFile[fileId] ?? [];
      const pageIds = new Set(pages.map((page) => page.id));
      const pageScopedDecorations = baseDecorations.filter(
        (decoration) =>
          decoration.pageId &&
          pageIds.has(decoration.pageId) &&
          sameDecorationSlot(decoration, kind, draft.position),
      );
      if (
        pages.length > 0 &&
        pages.every((page) =>
          pageScopedDecorations.some((decoration) => decoration.pageId === page.id),
        )
      ) {
        scopedDecorations = pageScopedDecorations;
      }
    }
    const exactScopedDecorations = scopedDecorations.filter((decoration) =>
      exactDecorationMatchesDraft(decoration, kind, draft),
    );
    const shouldRemove = scopedDecorations.length > 0 && scopedDecorations.length === exactScopedDecorations.length;
    const decorations = baseDecorations
      .filter((decoration) => !scopedDecorations.some((item) => item.id === decoration.id))
      .map((decoration) => ({ ...decoration }));

    let selectedDecorationId = current.selectedDecorationId;
    let logMessage: string;

    if (shouldRemove) {
      selectedDecorationId = decorations.some(
        (decoration) => decoration.id === current.selectedDecorationId,
      )
        ? current.selectedDecorationId
        : undefined;
      logMessage = `${draft.text} を解除しました。`;
    } else {
      const decoration = createDecorationFromDraft(kind, draft, pageId, fileId);
      decorations.push(decoration);
      selectedDecorationId = decoration.id;
      logMessage = fileId
        ? `${draft.text} をファイル全体へ適用しました。`
        : `${draft.text} をページへ適用しました。`;
    }

    commitSnapshot(
      set,
      current,
      {
        files: current.files.map((file) => ({ ...file })),
        pagesByFile: clonePages(current.pagesByFile),
        activeTool: current.activeTool,
        decorations,
        selectedDecorationId,
        security: cloneSecurity(current.security),
      },
      {
        logs: [createLog("info", logMessage), ...current.logs],
      },
    );
  },

  updateDecoration: (decorationId, patch) => {
    const current = get();
    const decorations = current.decorations.map((decoration) =>
      decoration.id === decorationId ? { ...decoration, ...patch } : { ...decoration },
    );
    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile: clonePages(current.pagesByFile),
      activeTool: current.activeTool,
      decorations,
      selectedDecorationId: decorationId,
      security: cloneSecurity(current.security),
    });
  },

  removeDecoration: (decorationId) => {
    const current = get();
    const decorations = current.decorations.filter(
      (decoration) => decoration.id !== decorationId,
    );
    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile: clonePages(current.pagesByFile),
      activeTool: current.activeTool,
      decorations,
      selectedDecorationId:
        current.selectedDecorationId === decorationId
          ? decorations[0]?.id
          : current.selectedDecorationId,
      security: cloneSecurity(current.security),
    });
  },


  updateSecurity: (patch) => {
    const current = get();
    const security = {
      ...current.security,
      ...patch,
    };
    commitSnapshot(
      set,
      current,
      {
        files: current.files.map((file) => ({ ...file })),
        pagesByFile: clonePages(current.pagesByFile),
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        security,
      },
      {
        logs: [
          createLog(
            "info",
            security.outputEncrypted
              ? "出力 PDF 暗号化を有効にしました。"
              : "出力 PDF 暗号化を無効にしました。",
          ),
          ...current.logs,
        ],
      },
    );
  },

  startExportJob: () => {
    const current = get();
    if (current.exportJob.status === "running") {
      return;
    }

    const waitingCount = current.files.filter((file) =>
      ["queued", "converting", "stale"].includes(file.cacheState),
    ).length;
    set({
      exportJob: {
        status: "running",
        progress: 1,
        currentStep: exportSteps[0],
        startedAt: Date.now(),
        cancellable: true,
        message: waitingCount > 0 ? "未完了変換を先に処理中" : "一括書き出し中",
      },
      lastOutputFiles: [],
      logs: [
        createLog(
          "info",
          `一括書き出しジョブを開始しました。出力予定 ${current.outputPlan.outputCount}ファイル。`,
        ),
        ...current.logs,
      ],
    });
  },

  setExportJobProgress: (progress, currentStep, message) => {
    const current = get();
    if (current.exportJob.status !== "running") {
      return;
    }
    set({
      exportJob: {
        ...current.exportJob,
        progress: Math.max(0, Math.min(99, progress)),
        currentStep: currentStep ?? current.exportJob.currentStep,
        message: message ?? current.exportJob.message,
      },
    });
  },

  completeExportJob: (outputFiles) => {
    const current = get();
    const names =
      outputFiles && outputFiles.length > 0
        ? outputFiles.map((file) => file.split(/[\\/]/).pop() ?? file)
        : current.outputPlan.outputFiles;
    set({
      exportJob: {
        status: "completed",
        progress: 100,
        currentStep: "保存",
        startedAt: current.exportJob.startedAt,
        completedAt: Date.now(),
        cancellable: false,
        message: "書き出し完了",
      },
      lastOutputFiles: outputFiles ?? [],
      logs: [
        createLog("info", `書き出しが完了しました: ${names.join(", ")}`),
        ...current.logs,
      ],
    });
  },

  failExportJob: (message) => {
    const current = get();
    set({
      exportJob: {
        ...current.exportJob,
        status: "error",
        progress: current.exportJob.progress,
        completedAt: Date.now(),
        cancellable: false,
        message: "書き出しエラー",
      },
      logs: [createLog("error", `書き出しに失敗しました: ${message}`), ...current.logs],
    });
  },

  tickExportJob: () => {
    const current = get();
    if (current.exportJob.status !== "running") {
      return;
    }

    const nextProgress = Math.min(100, current.exportJob.progress + 8);
    const stepIndex = Math.min(
      exportSteps.length - 1,
      Math.floor((nextProgress / 100) * exportSteps.length),
    );
    if (nextProgress >= 100) {
      set({
        exportJob: {
          status: "completed",
          progress: 100,
          currentStep: "保存",
          startedAt: current.exportJob.startedAt,
          completedAt: Date.now(),
          cancellable: false,
          message: "書き出し完了",
        },
        logs: [
          createLog(
            "info",
            `書き出しが完了しました: ${current.outputPlan.outputFiles.join(", ")}`,
          ),
          ...current.logs,
        ],
      });
      return;
    }

    set({
      exportJob: {
        ...current.exportJob,
        progress: nextProgress,
        currentStep: exportSteps[stepIndex],
        message: `${exportSteps[stepIndex]}を処理中`,
      },
    });
  },

  cancelExportJob: () => {
    const current = get();
    if (current.exportJob.status !== "running") {
      return;
    }
    set({
      exportJob: {
        ...current.exportJob,
        status: "cancelled",
        cancellable: false,
        message: "キャンセル済み",
      },
      logs: [createLog("warn", "書き出しジョブをキャンセルしました。"), ...current.logs],
    });
  },

  undo: () => {
    const current = get();
    const previous = current.history[current.history.length - 1];
    if (!previous) {
      return;
    }
    const nextHistory = current.history.slice(0, -1);
    const next = derive(snapshotOf(previous), current.outputSettings);
    set({
      ...next,
      history: nextHistory,
      future: [snapshotOf(current), ...current.future],
      canUndo: nextHistory.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const current = get();
    const nextSnapshot = current.future[0];
    if (!nextSnapshot) {
      return;
    }
    const nextFuture = current.future.slice(1);
    const next = derive(snapshotOf(nextSnapshot), current.outputSettings);
    set({
      ...next,
      history: [...current.history, snapshotOf(current)],
      future: nextFuture,
      canUndo: true,
      canRedo: nextFuture.length > 0,
    });
  },
}));
