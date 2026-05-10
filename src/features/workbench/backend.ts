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
  outputPath: string;
  sourcePath: string;
  kind: string;
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
    pageNumber: number;
    width: number;
    height: number;
  }>;
};

export type ExportWorkspaceResult = {
  outputFiles: string[];
  outputCount: number;
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
  });
}

export async function exportWorkspaceToDirectory(
  outputDir: string,
  workspace: WorkbenchSnapshot,
  passwordMap?: Record<string, string>,
): Promise<ExportWorkspaceResult> {
  return runTypedEngine<ExportWorkspaceResult>({
    kind: "export_workspace",
    outputDir,
    workspace,
    passwordMap,
  });
}

export async function exportWorkspaceToDirectoryStreaming(
  outputDir: string,
  workspace: WorkbenchSnapshot,
  passwordMap: Record<string, string> | undefined,
  jobId: string,
  onEvent: (event: ProcessingEngineEvent) => void,
): Promise<ExportWorkspaceResult> {
  if (!isTauriRuntime()) {
    return exportWorkspaceToDirectory(outputDir, workspace, passwordMap);
  }

  let unlisten: UnlistenFn | undefined;
  return new Promise<ExportWorkspaceResult>((resolve, reject) => {
    listenProcessingEngineEvents((event) => {
      if (event.jobId !== jobId) {
        return;
      }

      onEvent(event);
      if (event.type === "result") {
        unlisten?.();
        resolve(event.data as ExportWorkspaceResult);
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
        return startProcessingEngineJob({
          kind: "export_workspace",
          jobId,
          outputDir,
          workspace,
          passwordMap,
        });
      })
      .catch((error) => {
        unlisten?.();
        reject(error);
      });
  });
}
