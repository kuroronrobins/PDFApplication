import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./fileInput";
import type { CacheSession } from "./types";

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
