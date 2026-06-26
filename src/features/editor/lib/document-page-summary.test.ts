import { describe, expect, it } from "vitest";

import type { DocumentPage } from "@/features/editor/editor-types";
import { getDocumentPageChangeSummary } from "@/features/editor/lib/document-page-summary";

describe("document page summary helpers", () => {
  it("counts added, edited, and deleted pages", () => {
    const originalPages = createPages(4);
    const draftPages: DocumentPage[] = [
      originalPages[0],
      { ...originalPages[1], rotationDegrees: 90 },
      {
        id: "added-1",
        rotationDegrees: 0,
        sourceId: "source-2",
        sourcePageNumber: 1,
      },
      originalPages[3],
    ];

    expect(getDocumentPageChangeSummary(originalPages, draftPages)).toEqual({
      addedPages: 1,
      deletedPages: 1,
      editedPages: 1,
    });
  });

  it("does not count moved pages as edited", () => {
    const originalPages = createPages(3);
    const draftPages = [originalPages[2], originalPages[0], originalPages[1]];

    expect(getDocumentPageChangeSummary(originalPages, draftPages)).toEqual({
      addedPages: 0,
      deletedPages: 0,
      editedPages: 0,
    });
  });

  it("counts a rotated then deleted page as deleted only", () => {
    const originalPages = createPages(2);
    const draftPages = [originalPages[0]];

    expect(getDocumentPageChangeSummary(originalPages, draftPages)).toEqual({
      addedPages: 0,
      deletedPages: 1,
      editedPages: 0,
    });
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
