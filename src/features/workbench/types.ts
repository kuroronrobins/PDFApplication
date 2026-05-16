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
  | "lock"
  | "info";

export type DecorationKind = "header" | "footer" | "page-number" | "watermark";

export type DecorationTarget = "all" | "file" | "selected" | "output";

export type DecorationPosition =
  | "top-left"
  | "top"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "center";

export type DecorationDraft = {
  text: string;
  position: DecorationPosition;
  color: string;
  fontSize: number;
};

export type JobStatus = "idle" | "running" | "completed" | "cancelled" | "error";

export type JobStep =
  | "Office変換"
  | "PDF解析"
  | "結合"
  | "ページ編集反映"
  | "分割"
  | "装飾"
  | "暗号化"
  | "保存";

export type InputFileInfo = {
  path: string;
  name: string;
  extension: string;
  sizeBytes?: number;
  kind: InputFileKind;
  available?: boolean;
  validationCode?: string;
  validationMessage?: string;
  signatureKind?: string;
};

export type PdfMetadata = {
  encrypted: boolean;
  title?: string;
  author?: string;
  pageSizeLabel?: string;
};

export type FileEngineState = "synthetic" | "inspected" | "cached";

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
  selected: boolean;
  priority?: boolean;
  engineState?: FileEngineState;
  errorMessage?: string;
  metadata?: PdfMetadata;
};

export type PageItem = {
  id: string;
  fileId: string;
  sourceFileId?: string;
  pageNumber: number;
  originalPageNumber: number;
  thumbnailPath?: string;
  previewPath?: string;
  excluded: boolean;
  selected: boolean;
  splitAfter: boolean;
};

export type Decoration = {
  id: string;
  kind: DecorationKind;
  text: string;
  target: DecorationTarget;
  position: DecorationPosition;
  pageId?: string;
  fileId?: string;
  outputIndex?: number;
  excludedPageIds?: string[];
  fontSize: number;
  opacity: number;
  color?: string;
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
  defaultOutputFileName: string;
  autoOutputFiles: string[];
  outputFiles: string[];
  customOutputNamesApplied: boolean;
  outputDestinationDir?: string;
  activePageCount: number;
  excludedPageCount: number;
  splitCount: number;
  decorationCount: number;
  encrypted: boolean;
};

export type OutputSettings = {
  applied: boolean;
  destinationDir?: string;
  outputNames: string[];
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
  security: SecurityState;
};
