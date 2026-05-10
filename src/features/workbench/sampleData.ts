import type {
  Decoration,
  ExportJobState,
  PageItem,
  SearchReplaceState,
  SecurityState,
  WorkbenchFile,
  WorkbenchLog,
} from "./types";

export const initialFiles: WorkbenchFile[] = [
  {
    id: "estimate",
    sourcePath: "sample://estimate.xlsx",
    name: "見積.xlsx",
    kind: "excel",
    extension: "xlsx",
    sizeBytes: 248_000,
    pageCount: 8,
    cacheState: "converting",
    progress: 42,
    expanded: false,
    excluded: false,
    engineState: "synthetic",
    metadata: { encrypted: false, pageSizeLabel: "A4" },
  },
  {
    id: "contract",
    sourcePath: "sample://contract.docx",
    name: "契約書.docx",
    kind: "word",
    extension: "docx",
    sizeBytes: 184_000,
    pageCount: 0,
    cacheState: "queued",
    expanded: false,
    excluded: false,
    engineState: "synthetic",
    metadata: { encrypted: false, pageSizeLabel: "A4" },
  },
  {
    id: "slides",
    sourcePath: "sample://slides.pptx",
    name: "説明資料.pptx",
    kind: "powerpoint",
    extension: "pptx",
    sizeBytes: 928_000,
    pageCount: 12,
    cacheState: "converting",
    progress: 18,
    expanded: false,
    excluded: false,
    engineState: "synthetic",
    metadata: { encrypted: false, pageSizeLabel: "16:9" },
  },
  {
    id: "appendix",
    sourcePath: "sample://appendix.pdf",
    cachePath: "session://appendix.pdf",
    name: "添付資料.pdf",
    kind: "pdf",
    extension: "pdf",
    sizeBytes: 512_000,
    pageCount: 12,
    cacheState: "ready",
    progress: 100,
    expanded: true,
    excluded: false,
    engineState: "synthetic",
    metadata: {
      encrypted: false,
      title: "添付資料",
      author: "PDF Workbench",
      pageSizeLabel: "A4",
    },
  },
];

export const initialPagesByFile: Record<string, PageItem[]> = {
  appendix: Array.from({ length: 12 }, (_, index) => ({
    id: `appendix-${index + 1}`,
    fileId: "appendix",
    sourceFileId: "appendix",
    pageNumber: index + 1,
    originalPageNumber: index + 1,
    excluded: index === 3,
    selected: index === 5,
    splitAfter: index === 9,
    searchHit: [1, 5, 8].includes(index),
  })),
};

export const initialDecorations: Decoration[] = [
  {
    id: "dec-page-number",
    kind: "page-number",
    text: "{page} / {total}",
    target: "all",
    position: "bottom-right",
    fontSize: 10,
    opacity: 1,
  },
  {
    id: "dec-watermark",
    kind: "watermark",
    text: "CONFIDENTIAL",
    target: "selected",
    position: "center",
    pageId: "appendix-6",
    fontSize: 13,
    opacity: 0.32,
  },
];

export const initialSearchReplace: SearchReplaceState = {
  query: "契約",
  replacement: "合意",
  target: "all",
  matchCount: 3,
  appliedCount: 0,
};

export const initialSecurity: SecurityState = {
  inputPasswordRequired: false,
  outputEncrypted: false,
};

export const initialExportJob: ExportJobState = {
  status: "idle",
  progress: 0,
  cancellable: false,
  message: "待機中",
};

export const initialLogs: WorkbenchLog[] = [
  {
    id: "log-initial-1",
    time: "20:59:01",
    level: "info",
    message: "Office 変換ジョブを待機中です。",
  },
  {
    id: "log-initial-2",
    time: "20:59:04",
    level: "warn",
    message: "契約書.docx は展開時に優先変換されます。",
  },
];
