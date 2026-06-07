import type { EditorOverlay } from "@/features/editor/editor-types";
import { getOverlayRotationDegrees } from "@/features/editor/lib/overlay-capabilities";
import { clampMovedOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";

type MoveOverlayToPageLayerOptions = {
  insertBelowOverlayId?: string | null;
  overlayId: string;
  pageNumber: number;
  targetPageSize?: { height: number; width: number } | null;
};

type LayerMoveDirection = "back" | "backward" | "forward" | "front";

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

function moveOverlayLayerRelative(
  overlays: EditorOverlay[],
  overlayId: string,
  direction: LayerMoveDirection,
) {
  const currentIndex = overlays.findIndex(
    (overlay) => overlay.id === overlayId,
  );

  if (currentIndex === -1) {
    return overlays;
  }

  const overlayToMove = overlays[currentIndex];
  const pageOverlayIndexes = getPageOverlayIndexes(
    overlays,
    overlayToMove.pageNumber,
  );
  const pageOverlayPosition = pageOverlayIndexes.indexOf(currentIndex);

  if (pageOverlayPosition === -1) {
    return overlays;
  }

  const targetIndex = getRelativeLayerMoveTargetIndex(
    pageOverlayIndexes,
    pageOverlayPosition,
    direction,
  );

  if (targetIndex === undefined || targetIndex === currentIndex) {
    return overlays;
  }

  const insertionIndex =
    direction === "forward" || direction === "front"
      ? getInsertionIndexAfterOriginalIndex(currentIndex, targetIndex)
      : getInsertionIndexBeforeOriginalIndex(currentIndex, targetIndex);

  return moveOverlayToIndex(overlays, currentIndex, insertionIndex);
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

function getPageOverlayIndexes(overlays: EditorOverlay[], pageNumber: number) {
  const pageOverlayIndexes: number[] = [];

  overlays.forEach((overlay, index) => {
    if (overlay.pageNumber === pageNumber) {
      pageOverlayIndexes.push(index);
    }
  });

  return pageOverlayIndexes;
}

function getRelativeLayerMoveTargetIndex(
  pageOverlayIndexes: number[],
  pageOverlayPosition: number,
  direction: LayerMoveDirection,
) {
  switch (direction) {
    case "back":
      return pageOverlayIndexes[0];
    case "backward":
      return pageOverlayIndexes[pageOverlayPosition - 1];
    case "forward":
      return pageOverlayIndexes[pageOverlayPosition + 1];
    case "front":
      return pageOverlayIndexes.at(-1);
  }
}

function getInsertionIndexAfterOriginalIndex(
  currentIndex: number,
  targetIndex: number,
) {
  return targetIndex > currentIndex ? targetIndex : targetIndex + 1;
}

function getInsertionIndexBeforeOriginalIndex(
  currentIndex: number,
  targetIndex: number,
) {
  return targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
}

function moveOverlayToIndex(
  overlays: EditorOverlay[],
  currentIndex: number,
  insertionIndex: number,
) {
  const overlayToMove = overlays[currentIndex];
  const remainingOverlays = overlays.filter(
    (_, index) => index !== currentIndex,
  );

  return [
    ...remainingOverlays.slice(0, insertionIndex),
    overlayToMove,
    ...remainingOverlays.slice(insertionIndex),
  ];
}

export {
  getPageLayerOverlays,
  moveOverlayLayerRelative,
  moveOverlayToPageLayer,
  type LayerMoveDirection,
};
