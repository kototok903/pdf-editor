import type { EditorOverlay, PdfRect } from "@/features/editor/editor-types";

type ExternalPasteRecord = {
  overlayId: string;
  rect: PdfRect;
  signature: string;
};

function shouldSkipExternalPaste(
  record: ExternalPasteRecord | null,
  signature: string,
  overlays: EditorOverlay[],
) {
  if (!record || record.signature !== signature) {
    return false;
  }

  const overlay = overlays.find(
    (candidate) => candidate.id === record.overlayId,
  );

  return Boolean(overlay && areRectsEqual(overlay.rect, record.rect));
}

function createExternalPasteRecord(
  overlay: EditorOverlay,
  signature: string,
): ExternalPasteRecord {
  return {
    overlayId: overlay.id,
    rect: overlay.rect,
    signature,
  };
}

function areRectsEqual(left: PdfRect, right: PdfRect) {
  return (
    left.height === right.height &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y
  );
}

export { createExternalPasteRecord, shouldSkipExternalPaste };
export type { ExternalPasteRecord };
