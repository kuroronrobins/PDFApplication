import type {
  Decoration,
  OutputPlan,
  PageItem,
  SearchReplaceState,
  SecurityState,
  WorkbenchFile,
} from "./types";

export function buildOutputPlan(
  files: WorkbenchFile[],
  pagesByFile: Record<string, PageItem[]>,
  decorations: Decoration[] = [],
  searchReplace?: SearchReplaceState,
  security?: SecurityState,
): OutputPlan {
  const activeFiles = files.filter((file) => !file.excluded);
  const activePages = activeFiles.flatMap((file) =>
    (pagesByFile[file.id] ?? []).filter((page) => !page.excluded),
  );
  const excludedPageCount = activeFiles.reduce(
    (count, file) =>
      count + (pagesByFile[file.id] ?? []).filter((page) => page.excluded).length,
    0,
  );
  const splitCount = activePages.filter((page, index) => {
    const isLastActivePage = index === activePages.length - 1;
    return page.splitAfter && !isLastActivePage;
  }).length;
  const outputCount = activeFiles.length === 0 ? 0 : Math.max(1, splitCount + 1);
  const outputFiles = Array.from({ length: outputCount }, (_, index) =>
    `result_${String(index + 1).padStart(3, "0")}.pdf`,
  );

  return {
    outputCount,
    outputFiles,
    activePageCount: activePages.length,
    excludedPageCount,
    splitCount,
    decorationCount: decorations.length,
    searchReplaceCount: searchReplace?.appliedCount ?? 0,
    encrypted: security?.outputEncrypted ?? false,
  };
}
