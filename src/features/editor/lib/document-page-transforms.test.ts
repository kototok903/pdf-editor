import { describe, expect, it } from "vitest";

import type {
  DocumentPage,
  DocumentSource,
} from "@/features/editor/editor-types";
import {
  deleteDocumentPages,
  duplicateDocumentPages,
  getDocumentPageInsertIndex,
  mergeDocumentSourcePages,
  moveDocumentPages,
  moveDocumentPagesBySortableIndex,
  normalizeRotationDegrees,
  rotateDocumentPages,
} from "@/features/editor/lib/document-page-transforms";

describe("document page transform helpers", () => {
  it("rotates selected pages in 90-degree steps", () => {
    const pages = createPages(3);

    expect(
      rotateDocumentPages(pages, ["page-1", "page-3"], 90).map(
        (page) => page.rotationDegrees,
      ),
    ).toEqual([90, 0, 90]);
    expect(normalizeRotationDegrees(-90)).toBe(270);
    expect(() => normalizeRotationDegrees(45)).toThrow(RangeError);
  });

  it("deletes selected pages", () => {
    expect(
      deleteDocumentPages(createPages(4), ["page-2", "page-4"]).map(
        (page) => page.id,
      ),
    ).toEqual(["page-1", "page-3"]);
  });

  it("duplicates selected pages after their source page", () => {
    const result = duplicateDocumentPages(
      createPages(4),
      ["page-2", "page-4"],
      createSequentialPageIdFactory("copy"),
    );

    expect(result.documentPages.map((page) => page.id)).toEqual([
      "page-1",
      "page-2",
      "copy-1",
      "page-3",
      "page-4",
      "copy-2",
    ]);
    expect([...result.duplicatedPageIdMap]).toEqual([
      ["page-2", "copy-1"],
      ["page-4", "copy-2"],
    ]);
  });

  it("moves pages using an insert index from the visible draft order", () => {
    expect(
      moveDocumentPages(createPages(5), ["page-2", "page-3"], 5).map(
        (page) => page.id,
      ),
    ).toEqual(["page-1", "page-4", "page-5", "page-2", "page-3"]);
    expect(
      moveDocumentPages(createPages(5), ["page-2", "page-3"], 0).map(
        (page) => page.id,
      ),
    ).toEqual(["page-2", "page-3", "page-1", "page-4", "page-5"]);
    expect(
      moveDocumentPages(createPages(5), ["page-2"], 4).map((page) => page.id),
    ).toEqual(["page-1", "page-3", "page-4", "page-2", "page-5"]);
  });

  it("moves grouped sortable pages relative to unselected destination pages", () => {
    expect(
      moveDocumentPagesBySortableIndex(
        createPages(5),
        ["page-2", "page-3"],
        "page-2",
        2,
      ).map((page) => page.id),
    ).toEqual(["page-1", "page-2", "page-3", "page-4", "page-5"]);
    expect(
      moveDocumentPagesBySortableIndex(
        createPages(5),
        ["page-2", "page-3"],
        "page-3",
        3,
      ).map((page) => page.id),
    ).toEqual(["page-1", "page-4", "page-2", "page-3", "page-5"]);
    expect(
      moveDocumentPagesBySortableIndex(
        createPages(5),
        ["page-2", "page-3"],
        "page-2",
        5,
      ).map((page) => page.id),
    ).toEqual(["page-1", "page-4", "page-5", "page-2", "page-3"]);
  });

  it("moves a single sortable page by its projected index", () => {
    expect(
      moveDocumentPagesBySortableIndex(
        createPages(5),
        ["page-2"],
        "page-2",
        3,
      ).map((page) => page.id),
    ).toEqual(["page-1", "page-3", "page-4", "page-2", "page-5"]);
  });

  it("validates insert targets in large documents", () => {
    const pages = createPages(100);

    expect(
      getDocumentPageInsertIndex(pages, { placement: "beginning" }),
    ).toEqual({ insertIndex: 0, ok: true });
    expect(getDocumentPageInsertIndex(pages, { placement: "end" })).toEqual({
      insertIndex: 100,
      ok: true,
    });
    expect(
      getDocumentPageInsertIndex(pages, {
        pageNumber: 40,
        placement: "before",
      }),
    ).toEqual({ insertIndex: 39, ok: true });
    expect(
      getDocumentPageInsertIndex(pages, {
        pageNumber: 40,
        placement: "after",
      }),
    ).toEqual({ insertIndex: 40, ok: true });
    expect(
      getDocumentPageInsertIndex(pages, {
        pageNumber: 101,
        placement: "after",
      }),
    ).toMatchObject({ ok: false });
  });

  it("merges selected source pages at a visible insert index", () => {
    const source: DocumentSource = {
      bytes: new ArrayBuffer(1),
      fileName: "merged.pdf",
      id: "source-2",
      pageCount: 10,
    };
    const result = mergeDocumentSourcePages({
      createPageId: createSequentialPageIdFactory("merged"),
      documentPages: createPages(3),
      insertIndex: 1,
      source,
      sourcePageNumbers: [2, 3, 5],
    });

    expect(result.addedPageIds).toEqual(["merged-1", "merged-2", "merged-3"]);
    expect(result.documentPages.map((page) => page.id)).toEqual([
      "page-1",
      "merged-1",
      "merged-2",
      "merged-3",
      "page-2",
      "page-3",
    ]);
    expect(result.documentPages.slice(1, 4)).toMatchObject([
      { sourceId: "source-2", sourcePageNumber: 2 },
      { sourceId: "source-2", sourcePageNumber: 3 },
      { sourceId: "source-2", sourcePageNumber: 5 },
    ]);
    expect(() =>
      mergeDocumentSourcePages({
        documentPages: createPages(1),
        insertIndex: 0,
        source,
        sourcePageNumbers: [11],
      }),
    ).toThrow(RangeError);
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

function createSequentialPageIdFactory(prefix: string) {
  let nextId = 1;

  return () => `${prefix}-${nextId++}`;
}
