import type {
  Decoration,
  OutputPlan,
  OutputSettings,
  PageItem,
  SecurityState,
  WorkbenchFile,
} from "./types";

function extensionlessName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "").trim();
}

function sanitizeFileStem(stem: string): string {
  return stem
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
}

function defaultOutputStem(files: WorkbenchFile[]): string {
  const firstActiveFile = files.find((file) => !file.excluded);
  const sourceStem = firstActiveFile ? extensionlessName(firstActiveFile.name) : "result";
  const safeStem = sanitizeFileStem(sourceStem) || "result";
  return `${safeStem}_PDF化`;
}

function withPdfExtension(name: string): string {
  const trimmed = name.trim();
  return /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;
}

function outputNameAt(
  outputSettings: OutputSettings | undefined,
  autoName: string,
  index: number,
): string {
  const customName = outputSettings?.outputNames[index]?.trim();
  return customName ? withPdfExtension(customName) : autoName;
}

export function buildOutputPlan(
  files: WorkbenchFile[],
  pagesByFile: Record<string, PageItem[]>,
  decorations: Decoration[] = [],
  security?: SecurityState,
  outputSettings?: OutputSettings,
): OutputPlan {
  let activeFileCount = 0;
  let activePageCount = 0;
  let excludedPageCount = 0;
  let activeSplitMarkers = 0;
  let lastActivePageSplitAfter = false;

  for (const file of files) {
    if (file.excluded) {
      continue;
    }
    activeFileCount += 1;
    for (const page of pagesByFile[file.id] ?? []) {
      if (page.excluded) {
        excludedPageCount += 1;
        continue;
      }
      activePageCount += 1;
      if (page.splitAfter) {
        activeSplitMarkers += 1;
      }
      lastActivePageSplitAfter = page.splitAfter;
    }
  }

  const splitCount =
    activePageCount > 0
      ? activeSplitMarkers - (lastActivePageSplitAfter ? 1 : 0)
      : 0;
  const outputCount = activeFileCount === 0 ? 0 : Math.max(1, splitCount + 1);
  const outputStem = defaultOutputStem(files);
  const defaultOutputFileName = `${outputStem}.pdf`;
  const autoOutputFiles =
    outputCount <= 1
      ? outputCount === 1
        ? [defaultOutputFileName]
        : []
      : Array.from(
          { length: outputCount },
          (_, index) => `${outputStem}_${String(index + 1).padStart(3, "0")}.pdf`,
        );
  const customOutputNamesApplied = Boolean(
    outputSettings?.applied && outputSettings.destinationDir && outputCount > 0,
  );
  const outputFiles = customOutputNamesApplied
    ? autoOutputFiles.map((autoName, index) => outputNameAt(outputSettings, autoName, index))
    : autoOutputFiles;

  return {
    outputCount,
    defaultOutputFileName,
    autoOutputFiles,
    outputFiles,
    customOutputNamesApplied,
    outputDestinationDir: customOutputNamesApplied ? outputSettings?.destinationDir : undefined,
    activePageCount,
    excludedPageCount,
    splitCount,
    decorationCount: decorations.length,
    encrypted: security?.outputEncrypted ?? false,
  };
}
