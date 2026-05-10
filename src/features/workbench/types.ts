export type CacheState = "queued" | "converting" | "ready" | "error" | "stale";

export type FileKind = "excel" | "word" | "powerpoint" | "pdf";

export type InputFileKind = FileKind | "unsupported";

export type ToolId =
  | "select"
  | "scissors"
  | "trash"
  | "header"
  | "footer"
  | "page-number"
  | "watermark"
  | "search-replace"
  | "lock"
  | "info";

export type DecorationKind = "header" | "footer" | "page-number" | "watermark";

export type DecorationTarget = "all" | "selected" | "output";

export type DecorationPosition =
  | "top"
  | "bottom"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "center";

export type JobStatus = "idle" | "running" | "completed" | "cancelled" | "error";

export type JobStep =
  | "Office変換"
  | "PDF解析"
  | "結合"
  | "ページ編集反映"
  | "分割"
  | "装飾"
  | "検索置換"
  | "暗号化"
  | "保存";

export type InputFileInfo = {
  path: string;
  name: string;
  extension: string;
  sizeBytes?: number;
  kind: InputFileKind;
};

export type PdfMetadata = {
  encrypted: boolean;
  title?: string;
  author?: string;
  pageSizeLabel?: string;
};

export type WorkbenchFile = {
  id: string;
  sourcePath?: string;
  cachePath?: string;
  name: string;
  kind: FileKind;
  extension?: string;
  sizeBytes?: number;
  pageCount: number;
  cacheState: CacheState;
  progress?: number;
  expanded: boolean;
  excluded: boolean;
  priority?: boolean;
  metadata?: PdfMetadata;
};

export type PageItem = {
  id: string;
  fileId: string;
  pageNumber: number;
  originalPageNumber: number;
  excluded: boolean;
  selected: boolean;
  splitAfter: boolean;
  searchHit?: boolean;
};

export type Decoration = {
  id: string;
  kind: DecorationKind;
  text: string;
  target: DecorationTarget;
  position: DecorationPosition;
  pageId?: string;
  outputIndex?: number;
  fontSize: number;
  opacity: number;
};

export type SearchReplaceState = {
  query: string;
  replacement: string;
  target: DecorationTarget;
  matchCount: number;
  appliedCount: number;
};

export type SecurityState = {
  inputPasswordRequired: boolean;
  inputPassword?: string;
  outputEncrypted: boolean;
  outputPassword?: string;
};

export type ExportJobState = {
  status: JobStatus;
  progress: number;
  currentStep?: JobStep;
  startedAt?: number;
  completedAt?: number;
  cancellable: boolean;
  message: string;
};

export type CacheSession = {
  id: string;
  path?: string;
  initialized: boolean;
};

export type OutputPlan = {
  outputCount: number;
  outputFiles: string[];
  activePageCount: number;
  excludedPageCount: number;
  splitCount: number;
  decorationCount: number;
  searchReplaceCount: number;
  encrypted: boolean;
};

export type WorkbenchLog = {
  id: string;
  time: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type WorkbenchSnapshot = {
  files: WorkbenchFile[];
  pagesByFile: Record<string, PageItem[]>;
  activeTool: ToolId;
  decorations: Decoration[];
  selectedDecorationId?: string;
  searchReplace: SearchReplaceState;
  security: SecurityState;
};
