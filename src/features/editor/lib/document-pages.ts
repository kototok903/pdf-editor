import type {
  DocumentPage,
  DocumentPageId,
  DocumentSource,
  DocumentSourceId,
} from "@/features/editor/editor-types";

export function createDocumentSource({
  bytes,
  fileName,
  id = createDocumentSourceId(),
  pageCount,
}: {
  bytes: ArrayBuffer;
  fileName: string;
  id?: DocumentSourceId;
  pageCount: number;
}): DocumentSource {
  return {
    bytes,
    fileName,
    id,
    pageCount,
  };
}

export function createDocumentPagesForSource(
  source: DocumentSource,
): DocumentPage[] {
  return Array.from({ length: source.pageCount }, (_, index) => ({
    id: createDocumentPageId(),
    rotationDegrees: 0,
    sourceId: source.id,
    sourcePageNumber: index + 1,
  }));
}

export function createDocumentSourceId(): DocumentSourceId {
  return crypto.randomUUID();
}

export function createDocumentPageId(): DocumentPageId {
  return crypto.randomUUID();
}

export function getPageIdForVisiblePage(
  documentPages: readonly DocumentPage[],
  pageNumber: number,
): DocumentPageId | null {
  return documentPages[pageNumber - 1]?.id ?? null;
}

export function getVisiblePageNumberForPageId(
  documentPages: readonly DocumentPage[],
  pageId: DocumentPageId | null,
) {
  if (!pageId) {
    return null;
  }

  const pageIndex = documentPages.findIndex((page) => page.id === pageId);

  return pageIndex === -1 ? null : pageIndex + 1;
}
