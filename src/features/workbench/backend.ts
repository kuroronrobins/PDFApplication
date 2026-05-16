import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "./fileInput";
import type { CacheSession, JobStep, WorkbenchSnapshot } from "./types";

export type ProcessingEngineRequest = {
  jobId?: string;
  kind: string;
  [key: string]: unknown;
};

export type ProcessingEngineResponse = {
  type: "result" | "error";
  jobId?: string;
  data?: unknown;
  code?: string;
  message?: string;
  target?: string;
  detail?: string;
  logs?: Array<Record<string, unknown>>;
};

export type ProcessingEngineEvent =
  | ProcessingEngineResponse
  | {
      type: "progress";
      jobId?: string;
      step?: JobStep;
      progress: number;
      message: string;
    }
  | {
      type: "log";
      jobId?: string;
      level?: "info" | "warn" | "error";
      message: string;
    }
  | {
      type: "cancelled";
      jobId?: string;
      message?: string;
    };

export class ProcessingEngineCancelledError extends Error {
  constructor(message = "処理をキャンセルしました。") {
    super(message);
    this.name = "ProcessingEngineCancelledError";
  }
}

export type ConvertOfficeResult = {
  outputPath?: string;
  cachePath?: string;
  sourcePath: string;
  kind: string;
};

export type AlphaLicenseStatus = {
  valid: boolean;
  expiresOn: string;
  checkedAtEpochSeconds?: number;
  message?: string;
};

export type E2eBootstrapInfo = {
  enabled: boolean;
  files: string[];
  outputPath?: string;
  autoExport: boolean;
};

export type InspectPdfResult = {
  path: string;
  pageCount: number;
  encrypted: boolean;
  metadata: Record<string, string>;
};

export type RenderThumbnailsResult = {
  thumbnails: Array<{
    thumbnailPath: string;
    previewPath?: string;
    pageNumber: number;
    width: number;
    height: number;
    previewWidth?: number;
    previewHeight?: number;
  }>;
};

export type ExportWorkspaceResult = {
  outputFiles: string[];
  outputCount: number;
};

export type DecorationLayoutItem = {
  sourceDecorationId?: string;
  kind: "header" | "footer" | "page-number" | "watermark";
  position: string;
  slot?: "left" | "center" | "right";
  text: string;
  rectPt?: [number, number, number, number];
  pointPt?: [number, number];
  centerPt?: [number, number];
  baselinePt?: number;
  fontSizePt: number;
  color: string;
  align: "left" | "center" | "right";
  textWidthPt?: number;
  fontFamily?: string;
  rotationDeg?: number;
  opacity?: number;
};

export type DecorationLayoutManifest = {
  outputIndex: number;
  pageIndex: number;
  outputPageNumber: number;
  outputPageTotal: number;
  pageWidthPt: number;
  pageHeightPt: number;
  renderZoom: number;
  cacheKey: string;
  fontFamily?: string;
  items: DecorationLayoutItem[];
};

export type DecorationOverlayRenderResult = DecorationLayoutManifest & {
  overlayPath?: string | null;
  overlayWidth?: number | null;
  overlayHeight?: number | null;
  cached?: boolean;
};

export type ExportDestination =
  | { outputPath: string }
  | { outputDir: string; outputNames: string[] };

export type PreflightIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
  target?: string;
};

export type PreflightResult = {
  ok: boolean;
  issues: PreflightIssue[];
};

export async function prepareCacheSession(): Promise<CacheSession | null> {
  if (!isTauriRuntime()) {
    return {
      id: "browser-session",
      initialized: true,
    };
  }

  return invoke<CacheSession>("prepare_cache_session");
}

export async function cleanupCacheSession(sessionId: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("cleanup_cache_session", { sessionId });
}

export async function completeStartup(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("complete_startup");
}

export async function checkAlphaLicense(): Promise<AlphaLicenseStatus> {
  if (!isTauriRuntime()) {
    return {
      valid: true,
      expiresOn: "2026-06-30",
      message: "Browser development runtime",
    };
  }

  return invoke<AlphaLicenseStatus>("check_alpha_license");
}

export async function getE2eBootstrap(): Promise<E2eBootstrapInfo> {
  if (!isTauriRuntime()) {
    return {
      enabled: false,
      files: [],
      autoExport: false,
    };
  }

  return invoke<E2eBootstrapInfo>("get_e2e_bootstrap");
}

export async function writeE2eResult(payload: Record<string, unknown>): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("write_e2e_result", { payload });
}

export async function runProcessingEngine(
  request: ProcessingEngineRequest,
): Promise<ProcessingEngineResponse> {
  if (!isTauriRuntime()) {
    return {
      type: "error",
      code: "not_tauri",
      message: "Python worker is available only inside the Tauri runtime.",
    };
  }

  return invoke<ProcessingEngineResponse>("run_processing_engine", { request });
}

export function createProcessingJobId(prefix: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export async function startProcessingEngineJob(
  request: ProcessingEngineRequest,
): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error("Python worker jobs are available only inside the Tauri runtime.");
  }
  return invoke<string>("start_processing_engine_job", { request });
}

export async function cancelProcessingEngineJob(jobId: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }
  return invoke<boolean>("cancel_processing_engine_job", { jobId });
}

export async function listenProcessingEngineEvents(
  handler: (event: ProcessingEngineEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProcessingEngineEvent>("processing-engine-event", (event) => {
    handler(event.payload);
  });
}

function engineError(response: ProcessingEngineResponse): Error {
  const target = response.target ? ` (${response.target})` : "";
  const detail = response.detail ? ` ${response.detail}` : "";
  return new Error(`${response.message ?? response.code ?? "worker error"}${target}${detail}`);
}

async function runTypedEngine<T>(request: ProcessingEngineRequest): Promise<T> {
  const response = await runProcessingEngine(request);
  if (response.type === "error") {
    throw engineError(response);
  }
  return response.data as T;
}

async function runProcessingEngineJob<T>(
  request: ProcessingEngineRequest,
  jobId: string,
  onEvent: (event: ProcessingEngineEvent) => void,
): Promise<T> {
  let unlisten: UnlistenFn | undefined;
  return new Promise<T>((resolve, reject) => {
    listenProcessingEngineEvents((event) => {
      if (event.jobId !== jobId) {
        return;
      }

      onEvent(event);
      if (event.type === "result") {
        unlisten?.();
        resolve(event.data as T);
      } else if (event.type === "error") {
        unlisten?.();
        reject(engineError(event));
      } else if (event.type === "cancelled") {
        unlisten?.();
        reject(new ProcessingEngineCancelledError(event.message));
      }
    })
      .then((nextUnlisten) => {
        unlisten = nextUnlisten;
        return startProcessingEngineJob({ ...request, jobId });
      })
      .catch((error) => {
        unlisten?.();
        reject(error);
      });
  });
}

export async function convertOfficeFile(
  sourcePath: string,
  sessionDir: string,
  outputName: string,
): Promise<ConvertOfficeResult> {
  return runTypedEngine<ConvertOfficeResult>({
    kind: "convert_office",
    sourcePath,
    sessionDir,
    outputName,
  });
}

export async function convertOfficeFileStreaming(
  sourcePath: string,
  sessionDir: string,
  outputName: string,
  jobId: string,
  onEvent: (event: ProcessingEngineEvent) => void,
): Promise<ConvertOfficeResult> {
  if (!isTauriRuntime()) {
    return convertOfficeFile(sourcePath, sessionDir, outputName);
  }

  return runProcessingEngineJob<ConvertOfficeResult>(
    {
      kind: "convert_office",
      sourcePath,
      sessionDir,
      outputName,
    },
    jobId,
    onEvent,
  );
}

export async function inspectPdfFile(
  sourcePath: string,
  password?: string,
): Promise<InspectPdfResult> {
  return runTypedEngine<InspectPdfResult>({
    kind: "inspect_pdf",
    sourcePath,
    password,
  });
}

export async function renderPdfThumbnails(
  sourcePath: string,
  outputDir: string,
  pageCount: number,
  password?: string,
): Promise<RenderThumbnailsResult> {
  return runTypedEngine<RenderThumbnailsResult>({
    kind: "render_thumbnails",
    sourcePath,
    outputDir,
    pageNumbers: Array.from({ length: pageCount }, (_, index) => index + 1),
    password,
    thumbnailZoom: 0.32,
    previewZoom: 2.25,
  });
}

export async function renderExportDecorationManifestPage(
  workspace: WorkbenchSnapshot,
  outputDir: string,
  outputIndex: number,
  pageIndex: number,
  passwordMap?: Record<string, string>,
): Promise<DecorationLayoutManifest> {
  return runTypedEngine<DecorationLayoutManifest>({
    kind: "render_export_decoration_manifest_page",
    workspace,
    outputDir,
    outputIndex,
    pageIndex,
    passwordMap,
    overlayZoom: 2.25,
  });
}

export async function renderExportDecorationOverlayPage(
  workspace: WorkbenchSnapshot,
  outputDir: string,
  outputIndex: number,
  pageIndex: number,
  passwordMap?: Record<string, string>,
): Promise<DecorationOverlayRenderResult> {
  return runTypedEngine<DecorationOverlayRenderResult>({
    kind: "render_export_decoration_overlay_page",
    workspace,
    outputDir,
    outputIndex,
    pageIndex,
    passwordMap,
    overlayZoom: 2.25,
  });
}

export async function renderExportDecorationOverlayFromManifest(
  manifest: DecorationLayoutManifest,
  outputDir: string,
): Promise<DecorationOverlayRenderResult> {
  return runTypedEngine<DecorationOverlayRenderResult>({
    kind: "render_export_decoration_overlay_manifest",
    manifest,
    outputDir,
    overlayZoom: manifest.renderZoom || 2.25,
  });
}

export async function exportWorkspaceToPath(
  outputPath: string,
  workspace: WorkbenchSnapshot,
  passwordMap?: Record<string, string>,
): Promise<ExportWorkspaceResult> {
  return exportWorkspaceToDestination({ outputPath }, workspace, passwordMap);
}

export async function exportWorkspaceToDestination(
  destination: ExportDestination,
  workspace: WorkbenchSnapshot,
  passwordMap?: Record<string, string>,
): Promise<ExportWorkspaceResult> {
  return runTypedEngine<ExportWorkspaceResult>({
    kind: "export_workspace",
    ...destination,
    workspace,
    passwordMap,
  });
}

export async function exportWorkspaceToPathStreaming(
  outputPath: string,
  workspace: WorkbenchSnapshot,
  passwordMap: Record<string, string> | undefined,
  jobId: string,
  onEvent: (event: ProcessingEngineEvent) => void,
): Promise<ExportWorkspaceResult> {
  return exportWorkspaceToDestinationStreaming(
    { outputPath },
    workspace,
    passwordMap,
    jobId,
    onEvent,
  );
}

export async function exportWorkspaceToDestinationStreaming(
  destination: ExportDestination,
  workspace: WorkbenchSnapshot,
  passwordMap: Record<string, string> | undefined,
  jobId: string,
  onEvent: (event: ProcessingEngineEvent) => void,
): Promise<ExportWorkspaceResult> {
  if (!isTauriRuntime()) {
    return exportWorkspaceToDestination(destination, workspace, passwordMap);
  }

  return runProcessingEngineJob<ExportWorkspaceResult>(
    {
      kind: "export_workspace",
      ...destination,
      workspace,
      passwordMap,
    },
    jobId,
    onEvent,
  );
}

export async function preflightExportDestination(
  destination: ExportDestination,
): Promise<PreflightResult> {
  if (!isTauriRuntime()) {
    return { ok: true, issues: [] };
  }
  return invoke<PreflightResult>("preflight_export_destination", { destination });
}

export async function ensureExportDestinationReady(
  destination: ExportDestination,
): Promise<PreflightResult> {
  const result = await preflightExportDestination(destination);
  if (!result.ok) {
    const issue = result.issues.find((item) => item.level === "error") ?? result.issues[0];
    const target = issue?.target ? ` (${issue.target})` : "";
    throw new Error(`${issue?.message ?? "保存先を使用できません。"}${target}`);
  }
  return result;
}

export async function openOutputPath(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("open_output_path", { path });
}

export async function revealOutputPath(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("reveal_output_path", { path });
}
