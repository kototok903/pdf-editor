import type {
  EditorOverlay,
  ImageOverlay,
  SignatureOverlay,
} from "@/features/editor/editor-types";
import { normalizeRotationDegrees } from "@/features/editor/lib/overlay-coordinate-utils";

type RotatableOverlay = ImageOverlay | SignatureOverlay;

function isRotatableOverlay(
  overlay: EditorOverlay | null,
): overlay is RotatableOverlay {
  return overlay?.type === "image" || overlay?.type === "signature";
}

function getOverlayRotationDegrees(overlay: EditorOverlay | null) {
  return isRotatableOverlay(overlay)
    ? normalizeRotationDegrees(overlay.rotationDegrees ?? 0)
    : 0;
}

export { getOverlayRotationDegrees, isRotatableOverlay };
export type { RotatableOverlay };
