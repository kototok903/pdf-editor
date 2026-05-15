import type { EditorOverlay } from "@/features/editor/editor-types";

function getPageLayerOverlays(overlays: EditorOverlay[], pageNumber: number) {
  return overlays
    .filter((overlay) => overlay.pageNumber === pageNumber)
    .toReversed();
}

export { getPageLayerOverlays };
