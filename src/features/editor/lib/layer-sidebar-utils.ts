import type {
  DocumentPageId,
  EditorOverlay,
} from "@/features/editor/editor-types";
import { getOverlayRotationDegrees } from "@/features/editor/lib/overlay-capabilities";
import { clampMovedOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";

type MoveOverlayToPageLayerOptions = {
  insertBelowOverlayId?: string | null;
  overlayId: string;
  pageId: DocumentPageId;
  targetPageSize?: { height: number; width: number } | null;
};

export type LayerMoveDirection = "back" | "backward" | "forward" | "front";

export function getPageLayerOverlays(
  overlays: EditorOverlay[],
  pageId: DocumentPageId,
) {
  return overlays.filter((overlay) => overlay.pageId === pageId).toReversed();
}

export function moveOverlayToPageLayer(
  overlays: EditorOverlay[],
  {
    insertBelowOverlayId,
    overlayId,
    pageId,
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
    pageId,
    rect:
      targetPageSize && overlayToMove.pageId !== pageId
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
            overlay.id === insertBelowOverlayId && overlay.pageId === pageId,
        );

  if (insertBelowOverlayId != null && insertBelowOverlayIndex === -1) {
    return overlays;
  }

  const insertionIndex =
    insertBelowOverlayIndex === -1
      ? getTopLayerInsertionIndex(remainingOverlays, pageId)
      : insertBelowOverlayIndex;

  return [
    ...remainingOverlays.slice(0, insertionIndex),
    movedOverlay,
    ...remainingOverlays.slice(insertionIndex),
  ];
}

export function moveOverlayLayerRelative(
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
    overlayToMove.pageId,
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

function getTopLayerInsertionIndex(overlays: EditorOverlay[], pageId: string) {
  const lastPageOverlayIndex = overlays.findLastIndex(
    (overlay) => overlay.pageId === pageId,
  );

  return lastPageOverlayIndex === -1
    ? overlays.length
    : lastPageOverlayIndex + 1;
}

function getPageOverlayIndexes(overlays: EditorOverlay[], pageId: string) {
  const pageOverlayIndexes: number[] = [];

  overlays.forEach((overlay, index) => {
    if (overlay.pageId === pageId) {
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
