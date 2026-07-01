import type {
  DocumentPage,
  DocumentPageId,
  DocumentSource,
} from "@/features/editor/editor-types";
import { createDocumentPageId } from "@/features/editor/lib/document-pages";

type DocumentPageIdFactory = () => DocumentPageId;
type DocumentPageRotationDegrees = DocumentPage["rotationDegrees"];

export type DocumentPageInsertTarget =
  | { placement: "beginning" }
  | { placement: "end" }
  | { pageNumber: number; placement: "after" | "before" };

export type DocumentPageInsertIndexResult =
  | {
      insertIndex: number;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export type DuplicateDocumentPagesResult = {
  documentPages: DocumentPage[];
  duplicatedPageIdMap: Map<DocumentPageId, DocumentPageId>;
};

export type MergeDocumentSourcePagesResult = {
  addedPageIds: DocumentPageId[];
  documentPages: DocumentPage[];
};

export function rotateDocumentPages(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
  rotationDeltaDegrees: number,
): DocumentPage[] {
  const selectedPageIds = new Set(pageIds);

  return documentPages.map((page) =>
    selectedPageIds.has(page.id)
      ? {
          ...page,
          rotationDegrees: normalizeRotationDegrees(
            page.rotationDegrees + rotationDeltaDegrees,
          ),
        }
      : page,
  );
}

export function deleteDocumentPages(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
): DocumentPage[] {
  const selectedPageIds = new Set(pageIds);

  return documentPages.filter((page) => !selectedPageIds.has(page.id));
}

export function duplicateDocumentPages(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
  createPageId: DocumentPageIdFactory = createDocumentPageId,
): DuplicateDocumentPagesResult {
  const selectedPageIds = new Set(pageIds);
  const duplicatedPageIdMap = new Map<DocumentPageId, DocumentPageId>();
  const nextDocumentPages: DocumentPage[] = [];

  for (const page of documentPages) {
    nextDocumentPages.push(page);

    if (!selectedPageIds.has(page.id)) {
      continue;
    }

    const duplicatedPageId = createPageId();
    duplicatedPageIdMap.set(page.id, duplicatedPageId);
    nextDocumentPages.push({
      ...page,
      id: duplicatedPageId,
    });
  }

  return {
    documentPages: nextDocumentPages,
    duplicatedPageIdMap,
  };
}

export function moveDocumentPages(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
  insertIndex: number,
): DocumentPage[] {
  const normalizedInsertIndex = normalizeDocumentPageInsertIndex(
    documentPages,
    insertIndex,
  );
  const selectedPageIds = new Set(pageIds);
  const movingPages = documentPages.filter((page) =>
    selectedPageIds.has(page.id),
  );

  if (movingPages.length === 0) {
    return [...documentPages];
  }

  const remainingPages = documentPages.filter(
    (page) => !selectedPageIds.has(page.id),
  );
  const remainingInsertIndex = documentPages
    .slice(0, normalizedInsertIndex)
    .filter((page) => !selectedPageIds.has(page.id)).length;

  return [
    ...remainingPages.slice(0, remainingInsertIndex),
    ...movingPages,
    ...remainingPages.slice(remainingInsertIndex),
  ];
}

export function moveDocumentPagesBySortableIndex(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
  activePageId: DocumentPageId,
  sortableIndex: number,
): DocumentPage[] {
  const selectedPageIds = new Set(pageIds);
  selectedPageIds.add(activePageId);

  const activePage = documentPages.find((page) => page.id === activePageId);

  if (!activePage) {
    return [...documentPages];
  }

  const movingPages = documentPages.filter((page) =>
    selectedPageIds.has(page.id),
  );

  if (movingPages.length === 0) {
    return [...documentPages];
  }

  const pagesWithoutActive = documentPages.filter(
    (page) => page.id !== activePageId,
  );
  const projectedSortableIndex = normalizeDocumentPageInsertIndex(
    pagesWithoutActive,
    sortableIndex,
  );
  const projectedSinglePageOrder = [
    ...pagesWithoutActive.slice(0, projectedSortableIndex),
    activePage,
    ...pagesWithoutActive.slice(projectedSortableIndex),
  ];
  const activeProjectedIndex = projectedSinglePageOrder.findIndex(
    (page) => page.id === activePageId,
  );
  const remainingInsertIndex = projectedSinglePageOrder
    .slice(0, activeProjectedIndex)
    .filter((page) => !selectedPageIds.has(page.id)).length;
  const remainingPages = documentPages.filter(
    (page) => !selectedPageIds.has(page.id),
  );

  return [
    ...remainingPages.slice(0, remainingInsertIndex),
    ...movingPages,
    ...remainingPages.slice(remainingInsertIndex),
  ];
}

export function mergeDocumentSourcePages({
  createPageId = createDocumentPageId,
  documentPages,
  insertIndex,
  source,
  sourcePageNumbers,
}: {
  createPageId?: DocumentPageIdFactory;
  documentPages: readonly DocumentPage[];
  insertIndex: number;
  source: DocumentSource;
  sourcePageNumbers: readonly number[];
}): MergeDocumentSourcePagesResult {
  assertValidSourcePageNumbers(source, sourcePageNumbers);

  const addedPages: DocumentPage[] = sourcePageNumbers.map(
    (sourcePageNumber) => ({
      id: createPageId(),
      rotationDegrees: 0,
      sourceId: source.id,
      sourcePageNumber,
    }),
  );
  const normalizedInsertIndex = normalizeDocumentPageInsertIndex(
    documentPages,
    insertIndex,
  );

  return {
    addedPageIds: addedPages.map((page) => page.id),
    documentPages: [
      ...documentPages.slice(0, normalizedInsertIndex),
      ...addedPages,
      ...documentPages.slice(normalizedInsertIndex),
    ],
  };
}

export function getDocumentPageInsertIndex(
  documentPages: readonly DocumentPage[],
  target: DocumentPageInsertTarget,
): DocumentPageInsertIndexResult {
  switch (target.placement) {
    case "beginning":
      return { insertIndex: 0, ok: true };
    case "end":
      return { insertIndex: documentPages.length, ok: true };
    case "after":
    case "before": {
      if (
        !Number.isInteger(target.pageNumber) ||
        target.pageNumber < 1 ||
        target.pageNumber > documentPages.length
      ) {
        return {
          error: `Page number must be between 1 and ${documentPages.length}.`,
          ok: false,
        };
      }

      return {
        insertIndex:
          target.placement === "before"
            ? target.pageNumber - 1
            : target.pageNumber,
        ok: true,
      };
    }
  }
}

export function normalizeDocumentPageInsertIndex(
  documentPages: readonly DocumentPage[],
  insertIndex: number,
) {
  if (!Number.isFinite(insertIndex)) {
    return documentPages.length;
  }

  return Math.min(documentPages.length, Math.max(0, Math.trunc(insertIndex)));
}

export function normalizeRotationDegrees(
  rotationDegrees: number,
): DocumentPageRotationDegrees {
  const normalizedRotationDegrees = ((rotationDegrees % 360) + 360) % 360;

  if (
    normalizedRotationDegrees !== 0 &&
    normalizedRotationDegrees !== 90 &&
    normalizedRotationDegrees !== 180 &&
    normalizedRotationDegrees !== 270
  ) {
    throw new RangeError("Page rotation must be a multiple of 90 degrees.");
  }

  return normalizedRotationDegrees;
}

function assertValidSourcePageNumbers(
  source: DocumentSource,
  sourcePageNumbers: readonly number[],
) {
  for (const pageNumber of sourcePageNumbers) {
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > source.pageCount
    ) {
      throw new RangeError(
        `Source page number must be between 1 and ${source.pageCount}.`,
      );
    }
  }
}
