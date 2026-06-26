import type { DocumentPage } from "@/features/editor/editor-types";

export type DocumentPageChangeSummary = {
  addedPages: number;
  deletedPages: number;
  editedPages: number;
};

export function getDocumentPageChangeSummary(
  originalPages: readonly DocumentPage[],
  draftPages: readonly DocumentPage[],
): DocumentPageChangeSummary {
  const originalPagesById = new Map(
    originalPages.map((page) => [page.id, page]),
  );
  const draftPagesById = new Map(draftPages.map((page) => [page.id, page]));

  return {
    addedPages: draftPages.filter((page) => !originalPagesById.has(page.id))
      .length,
    deletedPages: originalPages.filter((page) => !draftPagesById.has(page.id))
      .length,
    editedPages: draftPages.filter((draftPage) => {
      const originalPage = originalPagesById.get(draftPage.id);

      return originalPage
        ? isDocumentPageContentEdited(originalPage, draftPage)
        : false;
    }).length,
  };
}

function isDocumentPageContentEdited(
  originalPage: DocumentPage,
  draftPage: DocumentPage,
) {
  return (
    originalPage.rotationDegrees !== draftPage.rotationDegrees ||
    originalPage.sourceId !== draftPage.sourceId ||
    originalPage.sourcePageNumber !== draftPage.sourcePageNumber
  );
}
