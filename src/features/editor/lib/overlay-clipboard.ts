import type {
  DocumentPageId,
  EditorOverlay,
  EditorOverlayInput,
  PdfRect,
} from "@/features/editor/editor-types";
import { isSupportedMarkType } from "@/features/editor/lib/mark-definitions";
import { normalizeRotationDegrees } from "@/features/editor/lib/overlay-coordinate-utils";
import { isSupportedTextFontId } from "@/features/editor/lib/text-font-id-utils";

export const APP_OVERLAY_MIME_TYPE =
  "web application/x-pdf-editor-overlay+json";
const overlayPasteOffset = 12;
const overlayClipboardVersion = 1;
export type OverlayClipboardPayload = {
  overlay: EditorOverlayInput;
  sourceOverlayId: string;
  version: typeof overlayClipboardVersion;
};

type OverlayPasteOptions = {
  pageId: DocumentPageId;
  pageSize: { height: number; width: number };
  pasteCount: number;
};

export function toOverlayClipboardPayload(
  overlay: EditorOverlay,
): OverlayClipboardPayload {
  return {
    overlay: overlayToInput(overlay),
    sourceOverlayId: overlay.id,
    version: overlayClipboardVersion,
  };
}

export function serializeOverlayClipboardPayload(
  payload: OverlayClipboardPayload,
) {
  return JSON.stringify(payload);
}

export function parseOverlayClipboardPayload(
  text: string,
): OverlayClipboardPayload | null {
  try {
    const value: unknown = JSON.parse(text);

    if (!isOverlayClipboardPayload(value)) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

export function toOverlayInput(
  payload: OverlayClipboardPayload,
  options: OverlayPasteOptions,
): EditorOverlayInput {
  return {
    ...payload.overlay,
    pageId: options.pageId,
    rect: offsetAndClampRect(
      payload.overlay.rect,
      options.pageSize,
      options.pasteCount,
    ),
  };
}

export function duplicateOverlayInput(
  overlay: EditorOverlay,
  options: { pageSize: { height: number; width: number } },
): EditorOverlayInput {
  return {
    ...overlayToInput(overlay),
    rect: offsetAndClampRect(overlay.rect, options.pageSize, 1),
  };
}

export function getTextFromOverlayPayload(payload: OverlayClipboardPayload) {
  return payload.overlay.type === "text" ? payload.overlay.text : null;
}

export function isSameOverlayClipboardPayload(
  left: OverlayClipboardPayload,
  right: OverlayClipboardPayload,
) {
  return (
    left.sourceOverlayId === right.sourceOverlayId &&
    JSON.stringify(left.overlay) === JSON.stringify(right.overlay)
  );
}

function overlayToInput(overlay: EditorOverlay): EditorOverlayInput {
  switch (overlay.type) {
    case "image":
    case "signature":
      return {
        assetId: overlay.assetId,
        pageId: overlay.pageId,
        rect: overlay.rect,
        rotationDegrees: normalizeRotationDegrees(overlay.rotationDegrees),
        sha256Signature: overlay.sha256Signature,
        type: overlay.type,
      };
    case "mark":
      return {
        color: overlay.color,
        markType: overlay.markType,
        pageId: overlay.pageId,
        rect: overlay.rect,
        type: overlay.type,
      };
    case "text":
      return {
        color: overlay.color,
        fontId: overlay.fontId,
        fontSize: overlay.fontSize,
        pageId: overlay.pageId,
        rect: overlay.rect,
        text: overlay.text,
        type: overlay.type,
      };
    case "whiteout":
      return {
        color: overlay.color,
        pageId: overlay.pageId,
        rect: overlay.rect,
        type: overlay.type,
      };
  }
}

function offsetAndClampRect(
  rect: PdfRect,
  pageSize: { height: number; width: number },
  pasteCount: number,
): PdfRect {
  const offset = pasteCount * overlayPasteOffset;

  return {
    ...rect,
    x: clamp(rect.x + offset, 0, Math.max(0, pageSize.width - rect.width)),
    y: clamp(rect.y + offset, 0, Math.max(0, pageSize.height - rect.height)),
  };
}

function isOverlayClipboardPayload(
  value: unknown,
): value is OverlayClipboardPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === overlayClipboardVersion &&
    typeof value.sourceOverlayId === "string" &&
    isOverlayInput(value.overlay)
  );
}

function isOverlayInput(value: unknown): value is EditorOverlayInput {
  if (!isRecord(value) || !isPdfRect(value.rect)) {
    return false;
  }

  if (typeof value.pageId !== "string") {
    return false;
  }

  switch (value.type) {
    case "image":
    case "signature":
      return (
        typeof value.assetId === "string" &&
        isOptionalFiniteNumber(value.rotationDegrees) &&
        typeof value.sha256Signature === "string"
      );
    case "mark":
      return (
        typeof value.color === "string" &&
        typeof value.markType === "string" &&
        isSupportedMarkType(value.markType)
      );
    case "text":
      return (
        typeof value.color === "string" &&
        typeof value.fontId === "string" &&
        isSupportedTextFontId(value.fontId) &&
        isFiniteNumber(value.fontSize) &&
        typeof value.text === "string"
      );
    case "whiteout":
      return typeof value.color === "string";
    default:
      return false;
  }
}

function isPdfRect(value: unknown): value is PdfRect {
  return (
    isRecord(value) &&
    isFiniteNumber(value.height) &&
    isFiniteNumber(value.width) &&
    value.height > 0 &&
    value.width > 0 &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalFiniteNumber(value: unknown) {
  return value === undefined || isFiniteNumber(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function getOverlayClipboardPayloadKey(
  payload: OverlayClipboardPayload,
) {
  return `${payload.sourceOverlayId}:${JSON.stringify(payload.overlay)}`;
}
