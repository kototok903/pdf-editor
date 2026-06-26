import type {
  DocumentPage,
  DocumentPageId,
} from "@/features/editor/editor-types";

export type PageRange = {
  end: number;
  start: number;
};

export type PageRangeParseResult =
  | {
      ok: true;
      pageNumbers: number[];
      ranges: PageRange[];
    }
  | {
      error: string;
      ok: false;
    };

export type PageIdsParseResult =
  | {
      ok: true;
      pageIds: DocumentPageId[];
      pageNumbers: number[];
      ranges: PageRange[];
    }
  | {
      error: string;
      ok: false;
    };

export function parsePageRanges(
  input: string,
  pageCount: number,
): PageRangeParseResult {
  const normalizedInput = input.trim();

  if (normalizedInput.length === 0) {
    return { ok: true, pageNumbers: [], ranges: [] };
  }

  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { error: "No pages are available.", ok: false };
  }

  const pageNumbers = new Set<number>();

  for (const token of normalizedInput.split(",")) {
    const normalizedToken = token.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(normalizedToken);

    if (!match) {
      return { error: `Invalid page range: ${normalizedToken}`, ok: false };
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (start < 1 || end < 1) {
      return { error: "Page ranges must start at page 1.", ok: false };
    }

    if (start > end) {
      return { error: "Page ranges cannot run backward.", ok: false };
    }

    if (end > pageCount) {
      return {
        error: `Page ${end} is outside this ${pageCount}-page document.`,
        ok: false,
      };
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pageNumbers.add(pageNumber);
    }
  }

  const sortedPageNumbers = [...pageNumbers].sort(
    (left, right) => left - right,
  );

  return {
    ok: true,
    pageNumbers: sortedPageNumbers,
    ranges: toPageRanges(sortedPageNumbers),
  };
}

export function parseVisiblePageRangesToPageIds(
  input: string,
  documentPages: readonly DocumentPage[],
): PageIdsParseResult {
  const parseResult = parsePageRanges(input, documentPages.length);

  if (!parseResult.ok) {
    return parseResult;
  }

  return {
    ok: true,
    pageIds: parseResult.pageNumbers
      .map((pageNumber) => documentPages[pageNumber - 1]?.id)
      .filter((pageId): pageId is DocumentPageId => Boolean(pageId)),
    pageNumbers: parseResult.pageNumbers,
    ranges: parseResult.ranges,
  };
}

export function formatPageRanges(pageNumbers: readonly number[]): string {
  return toPageRanges(
    [...new Set(pageNumbers)].sort((left, right) => left - right),
  )
    .map((range) =>
      range.start === range.end
        ? String(range.start)
        : `${range.start}-${range.end}`,
    )
    .join(", ");
}

export function formatPageIdsAsVisibleRanges(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
): string {
  return formatPageRanges(
    getVisiblePageNumbersForPageIds(documentPages, pageIds),
  );
}

export function getVisiblePageNumbersForPageIds(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
): number[] {
  const selectedPageIds = new Set(pageIds);

  return documentPages.flatMap((page, index) =>
    selectedPageIds.has(page.id) ? [index + 1] : [],
  );
}

export function toggleAllDocumentPageIds(
  documentPages: readonly DocumentPage[],
  selectedPageIds: Iterable<DocumentPageId>,
): DocumentPageId[] {
  return areAllDocumentPagesSelected(documentPages, selectedPageIds)
    ? []
    : documentPages.map((page) => page.id);
}

export function areAllDocumentPagesSelected(
  documentPages: readonly DocumentPage[],
  selectedPageIds: Iterable<DocumentPageId>,
) {
  const selectedPageIdSet = new Set(selectedPageIds);

  return (
    documentPages.length > 0 &&
    documentPages.every((page) => selectedPageIdSet.has(page.id))
  );
}

function toPageRanges(pageNumbers: readonly number[]): PageRange[] {
  const ranges: PageRange[] = [];

  for (const pageNumber of pageNumbers) {
    const lastRange = ranges.at(-1);

    if (lastRange && lastRange.end + 1 === pageNumber) {
      lastRange.end = pageNumber;
      continue;
    }

    ranges.push({ end: pageNumber, start: pageNumber });
  }

  return ranges;
}
