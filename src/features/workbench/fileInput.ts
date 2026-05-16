import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { InputFileInfo, InputFileKind } from "./types";

export const supportedExtensions = [
  "pdf",
  "xls",
  "xlsx",
  "xlsm",
  "xlsb",
  "doc",
  "docx",
  "docm",
  "ppt",
  "pptx",
  "pptm",
] as const;

type BrowserFileWithPath = File & {
  path?: string;
};

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function extensionOf(nameOrPath: string): string {
  const fileName = nameOrPath.split(/[\\/]/).pop() ?? nameOrPath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
}

export function kindFromExtension(extension: string): InputFileKind {
  const ext = extension.toLowerCase();
  if (ext === "pdf") {
    return "pdf";
  }
  if (["xls", "xlsx", "xlsm", "xlsb"].includes(ext)) {
    return "excel";
  }
  if (["doc", "docx", "docm"].includes(ext)) {
    return "word";
  }
  if (["ppt", "pptx", "pptm"].includes(ext)) {
    return "powerpoint";
  }
  return "unsupported";
}

export async function describeInputPaths(paths: string[]): Promise<InputFileInfo[]> {
  if (paths.length === 0) {
    return [];
  }
  return invoke<InputFileInfo[]>("describe_input_files", { paths });
}

export async function openInputFilesDialog(): Promise<InputFileInfo[] | null> {
  const selected = await open({
    multiple: true,
    directory: false,
    filters: [
      {
        name: "PDF / Office",
        extensions: [...supportedExtensions],
      },
    ],
  });

  if (!selected) {
    return null;
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return describeInputPaths(paths);
}

export async function openOutputFileDialog(defaultPath = "result.pdf"): Promise<string | null> {
  const selected = await save({
    defaultPath,
    filters: [
      {
        name: "PDF",
        extensions: ["pdf"],
      },
    ],
  });

  return selected || null;
}

export async function openOutputFolderDialog(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: true,
  });

  return typeof selected === "string" ? selected : null;
}

export function browserFilesToInputInfo(files: FileList | File[]): InputFileInfo[] {
  return Array.from(files).map((file) => {
    const extension = extensionOf(file.name);
    return {
      path: `browser://${encodeURIComponent(file.name)}:${file.size}:${file.lastModified}`,
      name: file.name,
      extension,
      sizeBytes: file.size,
      kind: kindFromExtension(extension),
    };
  });
}

export async function droppedFilesToInputInfo(
  files: FileList,
): Promise<InputFileInfo[]> {
  const dropped = Array.from(files) as BrowserFileWithPath[];
  const paths = dropped
    .map((file) => file.path)
    .filter((path): path is string => Boolean(path));

  if (isTauriRuntime() && paths.length === dropped.length) {
    return describeInputPaths(paths);
  }

  return browserFilesToInputInfo(dropped);
}
