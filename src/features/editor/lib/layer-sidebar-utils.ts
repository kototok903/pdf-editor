import type { EditorOverlay } from "@/features/editor/editor-types";
import { getOverlayRotationDegrees } from "@/features/editor/lib/overlay-capabilities";
import { clampMovedOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";

type MoveOverlayToPageLayerOptions = {
  insertBelowOverlayId?: string | null;
  overlayId: string;
  pageNumber: number;
  targetPageSize?: { height: number; width: number } | null;
};

function getPageLayerOverlays(overlays: EditorOverlay[], pageNumber: number) {
  return overlays
    .filter((overlay) => overlay.pageNumber === pageNumber)
    .toReversed();
}

function moveOverlayToPageLayer(
  overlays: EditorOverlay[],
  {
    insertBelowOverlayId,
    overlayId,
    pageNumber,
    targetPageSize,
  }: MoveOverlayToPageLayerOptions,
) {
  if (overlayId === insertBelowOverlayId) {
    return overlays;
  }

  const overlayToMove = overlays.find((overlay) => overlay.id === overlayId);

  if (!overlayToMove) {
    return overlays;
  }

  const remainingOverlays = overlays.filter(
    (overlay) => overlay.id !== overlayId,
  );
  const movedOverlay = {
    ...overlayToMove,
    pageNumber,
    rect:
      targetPageSize && overlayToMove.pageNumber !== pageNumber
        ? clampMovedOverlayRect(
            overlayToMove.rect,
            targetPageSize,
            undefined,
            getOverlayRotationDegrees(overlayToMove),
          )
        : overlayToMove.rect,
  };
  const insertBelowOverlayIndex =
    insertBelowOverlayId == null
      ? -1
      : remainingOverlays.findIndex(
          (overlay) =>
            overlay.id === insertBelowOverlayId &&
            overlay.pageNumber === pageNumber,
        );

  if (insertBelowOverlayId != null && insertBelowOverlayIndex === -1) {
    return overlays;
  }

  const insertionIndex =
    insertBelowOverlayIndex === -1
      ? getTopLayerInsertionIndex(remainingOverlays, pageNumber)
      : insertBelowOverlayIndex;

  return [
    ...remainingOverlays.slice(0, insertionIndex),
    movedOverlay,
    ...remainingOverlays.slice(insertionIndex),
  ];
}

function getTopLayerInsertionIndex(
  overlays: EditorOverlay[],
  pageNumber: number,
) {
  const lastPageOverlayIndex = overlays.findLastIndex(
    (overlay) => overlay.pageNumber === pageNumber,
  );

  return lastPageOverlayIndex === -1
    ? overlays.length
    : lastPageOverlayIndex + 1;
}

export { getPageLayerOverlays, moveOverlayToPageLayer };
