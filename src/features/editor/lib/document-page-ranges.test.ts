import { describe, expect, it } from "vitest";

import type { DocumentPage } from "@/features/editor/editor-types";
import {
  areAllDocumentPagesSelected,
  formatPageIdsAsVisibleRanges,
  formatPageRanges,
  getVisiblePageNumbersForPageIds,
  parsePageRanges,
  parseVisiblePageRangesToPageIds,
  toggleAllDocumentPageIds,
} from "@/features/editor/lib/document-page-ranges";

describe("document page range helpers", () => {
  it("parses and formats visible page ranges", () => {
    expect(parsePageRanges("2-3, 5, 3", 5)).toEqual({
      ok: true,
      pageNumbers: [2, 3, 5],
      ranges: [
        { end: 3, start: 2 },
        { end: 5, start: 5 },
      ],
    });
    expect(formatPageRanges([5, 3, 2, 3])).toBe("2-3, 5");
  });

  it("rejects invalid range input", () => {
    expect(parsePageRanges("3-2", 5)).toMatchObject({ ok: false });
    expect(parsePageRanges("0", 5)).toMatchObject({ ok: false });
    expect(parsePageRanges("6", 5)).toMatchObject({ ok: false });
    expect(parsePageRanges("two", 5)).toMatchObject({ ok: false });
  });

  it("handles large visible page ranges", () => {
    const result = parsePageRanges("1-100", 100);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.pageNumbers.length : 0).toBe(100);
    expect(formatPageRanges(result.ok ? result.pageNumbers : [])).toBe("1-100");
  });

  it("maps visible ranges and selected ids through draft page order", () => {
    const pages = createPages(5);

    expect(parseVisiblePageRangesToPageIds("2-3, 5", pages)).toEqual({
      ok: true,
      pageIds: ["page-2", "page-3", "page-5"],
      pageNumbers: [2, 3, 5],
      ranges: [
        { end: 3, start: 2 },
        { end: 5, start: 5 },
      ],
    });
    expect(
      getVisiblePageNumbersForPageIds(pages, ["page-5", "page-2", "missing"]),
    ).toEqual([2, 5]);
    expect(formatPageIdsAsVisibleRanges(pages, ["page-5", "page-2"])).toBe(
      "2, 5",
    );
  });

  it("toggles all pages like a select-all checkbox", () => {
    const pages = createPages(3);

    expect(areAllDocumentPagesSelected(pages, ["page-1", "page-2"])).toBe(
      false,
    );
    expect(toggleAllDocumentPageIds(pages, ["page-1", "page-2"])).toEqual([
      "page-1",
      "page-2",
      "page-3",
    ]);
    expect(
      toggleAllDocumentPageIds(
        pages,
        pages.map((page) => page.id),
      ),
    ).toEqual([]);
  });
});

function createPages(count: number): DocumentPage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `page-${index + 1}`,
    rotationDegrees: 0,
    sourceId: "source-1",
    sourcePageNumber: index + 1,
  }));
}
