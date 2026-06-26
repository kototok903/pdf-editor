import type {
  DocumentPageId,
  EditorFormEdits,
  EditorOverlay,
  PdfFormValue,
} from "@/features/editor/editor-types";

type PageIdMap = Map<DocumentPageId, DocumentPageId>;
type OverlayIdFactory = (overlay: EditorOverlay) => string;

export function duplicateOverlaysForPageIds(
  overlays: readonly EditorOverlay[],
  pageIdMap: PageIdMap,
  createOverlayId: OverlayIdFactory = () => crypto.randomUUID(),
): EditorOverlay[] {
  return overlays.flatMap((overlay) => {
    const targetPageId = pageIdMap.get(overlay.pageId);

    if (!targetPageId) {
      return [];
    }

    return [
      cloneOverlayWithPageId(overlay, {
        id: createOverlayId(overlay),
        pageId: targetPageId,
      }),
    ];
  });
}

export function duplicateFormValuesForPageIds(
  formEdits: EditorFormEdits,
  pageIdMap: PageIdMap,
): EditorFormEdits {
  const duplicatedValues = formEdits.values.flatMap((value) => {
    const targetPageId = pageIdMap.get(value.pageId);

    return targetPageId ? [cloneFormValueWithPageId(value, targetPageId)] : [];
  });

  return { values: duplicatedValues };
}

export function dropOverlaysForMissingPageIds(
  overlays: readonly EditorOverlay[],
  pageIds: Iterable<DocumentPageId>,
): EditorOverlay[] {
  const remainingPageIds = new Set(pageIds);

  return overlays.filter((overlay) => remainingPageIds.has(overlay.pageId));
}

export function dropFormValuesForMissingPageIds(
  formEdits: EditorFormEdits,
  pageIds: Iterable<DocumentPageId>,
): EditorFormEdits {
  const remainingPageIds = new Set(pageIds);

  return {
    values: formEdits.values.filter((value) =>
      remainingPageIds.has(value.pageId),
    ),
  };
}

function cloneOverlayWithPageId(
  overlay: EditorOverlay,
  patch: Pick<EditorOverlay, "id" | "pageId">,
): EditorOverlay {
  return {
    ...overlay,
    ...patch,
    rect: { ...overlay.rect },
  };
}

function cloneFormValueWithPageId(
  value: PdfFormValue,
  pageId: DocumentPageId,
): PdfFormValue {
  if (value.type === "choice") {
    return {
      ...value,
      pageId,
      values: [...value.values],
    };
  }

  return {
    ...value,
    pageId,
  };
}
