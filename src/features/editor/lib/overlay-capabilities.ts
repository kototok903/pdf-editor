import type {
  EditorOverlay,
  ImageOverlay,
  SignatureOverlay,
} from "@/features/editor/editor-types";
import { normalizeRotationDegrees } from "@/features/editor/lib/overlay-coordinate-utils";

export type RotatableOverlay = ImageOverlay | SignatureOverlay;

export function isRotatableOverlay(
  overlay: EditorOverlay | null,
): overlay is RotatableOverlay {
  return overlay?.type === "image" || overlay?.type === "signature";
}

export function getOverlayRotationDegrees(overlay: EditorOverlay | null) {
  return isRotatableOverlay(overlay)
    ? normalizeRotationDegrees(overlay.rotationDegrees ?? 0)
    : 0;
}
