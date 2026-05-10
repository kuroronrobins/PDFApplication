import { create } from "zustand";
import { buildOutputPlan } from "./outputPlan";
import {
  initialDecorations,
  initialExportJob,
  initialFiles,
  initialLogs,
  initialPagesByFile,
  initialSearchReplace,
  initialSecurity,
} from "./sampleData";
import type {
  CacheState,
  CacheSession,
  Decoration,
  DecorationKind,
  DecorationPosition,
  DecorationTarget,
  ExportJobState,
  InputFileInfo,
  JobStep,
  OutputPlan,
  PageItem,
  PdfMetadata,
  SearchReplaceState,
  SecurityState,
  ToolId,
  WorkbenchFile,
  WorkbenchLog,
  WorkbenchSnapshot,
} from "./types";

type WorkbenchState = WorkbenchSnapshot & {
  cacheSession: CacheSession;
  exportDirectory?: string;
  exportJob: ExportJobState;
  logs: WorkbenchLog[];
  history: WorkbenchSnapshot[];
  future: WorkbenchSnapshot[];
  outputPlan: OutputPlan;
  canUndo: boolean;
  canRedo: boolean;
  setActiveTool: (tool: ToolId) => void;
  setCacheSession: (session: CacheSession) => void;
  addInputFiles: (inputFiles: InputFileInfo[]) => void;
  addLog: (level: WorkbenchLog["level"], message: string) => void;
  setExportDirectory: (path: string) => void;
  toggleFileExpanded: (fileId: string) => void;
  toggleFileExcluded: (fileId: string) => void;
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
      engineState?: WorkbenchFile["engineState"];
      message?: string;
    },
  ) => void;
  failFileProcessing: (fileId: string, message: string) => void;
  tickBackgroundJobs: () => void;
  selectPage: (pageId: string, additive?: boolean) => void;
  togglePageExcluded: (pageId: string) => void;
  togglePageSplit: (pageId: string) => void;
  movePageToIndex: (pageId: string, targetFileId: string, insertionIndex: number) => void;
  deleteSelectedPages: () => void;
  placeDecoration: (
    kind: DecorationKind,
    pageId?: string,
    position?: DecorationPosition,
  ) => void;
  updateDecoration: (decorationId: string, patch: Partial<Decoration>) => void;
  removeDecoration: (decorationId: string) => void;
  updateSearchReplace: (patch: Partial<SearchReplaceState>) => void;
  applySearchReplace: () => void;
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

const exportSteps: JobStep[] = [
  "Office変換",
  "PDF解析",
  "結合",
  "ページ編集反映",
  "分割",
  "装飾",
  "検索置換",
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

function cloneSearchReplace(searchReplace: SearchReplaceState): SearchReplaceState {
  return { ...searchReplace };
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
    searchReplace: cloneSearchReplace(state.searchReplace),
    security: cloneSecurity(state.security),
  };
}

function derive(snapshot: WorkbenchSnapshot) {
  const outputPlan = buildOutputPlan(
    snapshot.files,
    snapshot.pagesByFile,
    snapshot.decorations,
    snapshot.searchReplace,
    snapshot.security,
  );
  return {
    ...snapshot,
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
): PageItem[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `${fileId}-p${index + 1}`,
    fileId,
    sourceFileId,
    pageNumber: index + 1,
    originalPageNumber: index + 1,
    thumbnailPath: thumbnailPaths[index + 1],
    excluded: false,
    selected: false,
    splitAfter: false,
    searchHit: false,
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

function defaultDecorationTarget(pageId?: string): DecorationTarget {
  return pageId ? "selected" : "all";
}

function commitSnapshot(
  set: (state: Partial<WorkbenchState>) => void,
  current: WorkbenchState,
  nextSnapshot: WorkbenchSnapshot,
  extra?: Partial<WorkbenchState>,
) {
  const previous = snapshotOf(current);
  const next = derive(nextSnapshot);
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
  files: initialFiles,
  pagesByFile: initialPagesByFile,
  activeTool: "select",
  decorations: initialDecorations,
  selectedDecorationId: undefined,
  searchReplace: initialSearchReplace,
  security: initialSecurity,
};

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  ...derive(snapshotOf(initialSnapshot)),
  cacheSession: {
    id: randomId("session"),
    initialized: false,
  },
  exportJob: initialExportJob,
  logs: initialLogs,
  history: [],
  future: [],
  canUndo: false,
  canRedo: false,

  setActiveTool: (tool) => {
    set({ activeTool: tool });
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

    const current = get();
    const incomingRealFiles = inputFiles.some(
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

    inputFiles.forEach((info) => {
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
        searchReplace: replaceSampleWorkspace
          ? {
              query: "",
              replacement: "",
              target: "all",
              matchCount: 0,
              appliedCount: 0,
            }
          : cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      },
      { logs },
    );
  },

  addLog: (level, message) => {
    set((state) => ({
      logs: [createLog(level, message), ...state.logs],
    }));
  },

  setExportDirectory: (path) => {
    set((state) => ({
      exportDirectory: path,
      logs: [createLog("info", `出力先を設定しました: ${path}`), ...state.logs],
    }));
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

    const files = current.files.map((file) =>
      file.id === fileId ? { ...file, expanded: !file.expanded } : { ...file },
    );
    commitSnapshot(set, current, {
      files,
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      searchReplace: cloneSearchReplace(current.searchReplace),
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
      searchReplace: cloneSearchReplace(current.searchReplace),
      security: cloneSecurity(current.security),
    });
  },

  moveFile: (fileId, direction) => {
    const current = get();
    const index = current.files.findIndex((file) => file.id === fileId);
    if (index < 0) {
      return;
    }
    get().moveFileToIndex(fileId, index + direction);
  },

  moveFileToIndex: (fileId, insertionIndex) => {
    const current = get();
    const fromIndex = current.files.findIndex((file) => file.id === fileId);
    if (fromIndex < 0) {
      return;
    }

    const clampedInsertionIndex = Math.max(
      0,
      Math.min(insertionIndex, current.files.length),
    );
    const adjustedIndex =
      fromIndex < clampedInsertionIndex
        ? clampedInsertionIndex - 1
        : clampedInsertionIndex;

    if (fromIndex === adjustedIndex) {
      return;
    }

    const files = current.files.map((file) => ({ ...file }));
    const [file] = files.splice(fromIndex, 1);
    files.splice(adjustedIndex, 0, file);
    commitSnapshot(set, current, {
      files,
      pagesByFile: clonePages(current.pagesByFile),
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      searchReplace: cloneSearchReplace(current.searchReplace),
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
        searchReplace: cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      }),
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
        searchReplace: cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      }),
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
        searchReplace: cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      }),
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
        searchReplace: cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      }),
      logs,
    });
  },

  selectPage: (pageId, additive = false) => {
    const current = get();
    const pagesByFile = clonePages(current.pagesByFile);
    for (const pages of Object.values(pagesByFile)) {
      for (const page of pages) {
        if (page.id === pageId) {
          page.selected = additive ? !page.selected : true;
        } else if (!additive) {
          page.selected = false;
        }
      }
    }
    set(
      derive({
        files: current.files.map((file) => ({ ...file })),
        pagesByFile,
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        searchReplace: cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      }),
    );
  },

  togglePageExcluded: (pageId) => {
    const current = get();
    const fileId = findPageFile(current.pagesByFile, pageId);
    if (!fileId) {
      return;
    }
    const pagesByFile = clonePages(current.pagesByFile);
    pagesByFile[fileId] = pagesByFile[fileId].map((page) =>
      page.id === pageId ? { ...page, excluded: !page.excluded } : page,
    );
    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      searchReplace: cloneSearchReplace(current.searchReplace),
      security: cloneSecurity(current.security),
    });
  },

  togglePageSplit: (pageId) => {
    const current = get();
    const fileId = findPageFile(current.pagesByFile, pageId);
    if (!fileId) {
      return;
    }
    const pagesByFile = clonePages(current.pagesByFile);
    pagesByFile[fileId] = pagesByFile[fileId].map((page) =>
      page.id === pageId ? { ...page, splitAfter: !page.splitAfter } : page,
    );
    commitSnapshot(set, current, {
      files: current.files.map((file) => ({ ...file })),
      pagesByFile,
      activeTool: current.activeTool,
      decorations: current.decorations.map((decoration) => ({ ...decoration })),
      selectedDecorationId: current.selectedDecorationId,
      searchReplace: cloneSearchReplace(current.searchReplace),
      security: cloneSecurity(current.security),
    });
  },

  movePageToIndex: (pageId, targetFileId, insertionIndex) => {
    const current = get();
    const sourceFileId = findPageFile(current.pagesByFile, pageId);
    if (!sourceFileId || !current.pagesByFile[targetFileId]) {
      return;
    }

    const pagesByFile = clonePages(current.pagesByFile);
    const sourcePages = pagesByFile[sourceFileId];
    const sourceIndex = sourcePages.findIndex((page) => page.id === pageId);
    if (sourceIndex < 0) {
      return;
    }
    const [page] = sourcePages.splice(sourceIndex, 1);
    const targetPages = sourceFileId === targetFileId ? sourcePages : pagesByFile[targetFileId];
    const adjustedIndex =
      sourceFileId === targetFileId && sourceIndex < insertionIndex
        ? insertionIndex - 1
        : insertionIndex;
    const clampedIndex = Math.max(0, Math.min(adjustedIndex, targetPages.length));
    targetPages.splice(clampedIndex, 0, {
      ...page,
      fileId: targetFileId,
      sourceFileId: page.sourceFileId ?? sourceFileId,
    });
    pagesByFile[sourceFileId] = renumberPages(sourcePages, sourceFileId);
    pagesByFile[targetFileId] = renumberPages(targetPages, targetFileId);

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
      searchReplace: cloneSearchReplace(current.searchReplace),
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
      searchReplace: cloneSearchReplace(current.searchReplace),
      security: cloneSecurity(current.security),
    });
  },

  placeDecoration: (kind, pageId, position) => {
    const current = get();
    const decoration: Decoration = {
      id: randomId("decoration"),
      kind,
      text: defaultDecorationText(kind),
      target: defaultDecorationTarget(pageId),
      position: position ?? defaultDecorationPosition(kind),
      pageId,
      fontSize: kind === "watermark" ? 16 : 10,
      opacity: kind === "watermark" ? 0.32 : 1,
    };
    commitSnapshot(
      set,
      current,
      {
        files: current.files.map((file) => ({ ...file })),
        pagesByFile: clonePages(current.pagesByFile),
        activeTool: current.activeTool,
        decorations: [...current.decorations.map((item) => ({ ...item })), decoration],
        selectedDecorationId: decoration.id,
        searchReplace: cloneSearchReplace(current.searchReplace),
        security: cloneSecurity(current.security),
      },
      {
        logs: [
          createLog("info", `${defaultDecorationText(kind)} をページへ配置しました。`),
          ...current.logs,
        ],
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
      searchReplace: cloneSearchReplace(current.searchReplace),
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
      searchReplace: cloneSearchReplace(current.searchReplace),
      security: cloneSecurity(current.security),
    });
  },

  updateSearchReplace: (patch) => {
    const current = get();
    const searchReplace = {
      ...current.searchReplace,
      ...patch,
    };
    const pagesByFile = clonePages(current.pagesByFile);
    const query = searchReplace.query.trim();
    let matchCount = 0;
    for (const pages of Object.values(pagesByFile)) {
      for (const page of pages) {
        const hit = Boolean(query) && (page.pageNumber + page.fileId.length) % 4 === 0;
        page.searchHit = hit;
        if (hit) {
          matchCount += 1;
        }
      }
    }
    set(
      derive({
        files: current.files.map((file) => ({ ...file })),
        pagesByFile,
        activeTool: current.activeTool,
        decorations: current.decorations.map((decoration) => ({ ...decoration })),
        selectedDecorationId: current.selectedDecorationId,
        searchReplace: { ...searchReplace, matchCount },
        security: cloneSecurity(current.security),
      }),
    );
  },

  applySearchReplace: () => {
    const current = get();
    const appliedCount = current.searchReplace.matchCount;
    const searchReplace = {
      ...current.searchReplace,
      appliedCount,
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
        searchReplace,
        security: cloneSecurity(current.security),
      },
      {
        logs: [
          createLog(
            "info",
            `検索置換を予約しました: ${appliedCount}件を一括書き出し時に反映します。`,
          ),
          ...current.logs,
        ],
      },
    );
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
        searchReplace: cloneSearchReplace(current.searchReplace),
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
    const next = derive(snapshotOf(previous));
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
    const next = derive(snapshotOf(nextSnapshot));
    set({
      ...next,
      history: [...current.history, snapshotOf(current)],
      future: nextFuture,
      canUndo: true,
      canRedo: nextFuture.length > 0,
    });
  },
}));
