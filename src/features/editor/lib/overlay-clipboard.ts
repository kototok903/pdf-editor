import type {
  EditorOverlay,
  EditorOverlayInput,
  PdfRect,
  TextFontId,
} from "@/features/editor/editor-types";
import { isSupportedMarkType } from "@/features/editor/lib/mark-definitions";

const APP_OVERLAY_MIME_TYPE = "web application/x-pdf-editor-overlay+json";
const overlayPasteOffset = 12;
const overlayClipboardVersion = 1;
const supportedTextFontIds = new Set<TextFontId>([
  "courier",
  "helvetica",
  "times-roman",
]);

type OverlayClipboardPayload = {
  overlay: EditorOverlayInput;
  sourceOverlayId: string;
  version: typeof overlayClipboardVersion;
};

type OverlayPasteOptions = {
  pageNumber: number;
  pageSize: { height: number; width: number };
  pasteCount: number;
};

function toOverlayClipboardPayload(
  overlay: EditorOverlay,
): OverlayClipboardPayload {
  return {
    overlay: overlayToInput(overlay),
    sourceOverlayId: overlay.id,
    version: overlayClipboardVersion,
  };
}

function serializeOverlayClipboardPayload(payload: OverlayClipboardPayload) {
  return JSON.stringify(payload);
}

function parseOverlayClipboardPayload(
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

function toOverlayInput(
  payload: OverlayClipboardPayload,
  options: OverlayPasteOptions,
): EditorOverlayInput {
  return {
    ...payload.overlay,
    pageNumber: options.pageNumber,
    rect: offsetAndClampRect(
      payload.overlay.rect,
      options.pageSize,
      options.pasteCount,
    ),
  };
}

function duplicateOverlayInput(
  overlay: EditorOverlay,
  options: { pageSize: { height: number; width: number } },
): EditorOverlayInput {
  return {
    ...overlayToInput(overlay),
    rect: offsetAndClampRect(overlay.rect, options.pageSize, 1),
  };
}

function getTextFromOverlayPayload(payload: OverlayClipboardPayload) {
  return payload.overlay.type === "text" ? payload.overlay.text : null;
}

function isSameOverlayClipboardPayload(
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
      return {
        assetId: overlay.assetId,
        pageNumber: overlay.pageNumber,
        rect: overlay.rect,
        sha256Signature: overlay.sha256Signature,
        type: overlay.type,
      };
    case "mark":
      return {
        color: overlay.color,
        markType: overlay.markType,
        pageNumber: overlay.pageNumber,
        rect: overlay.rect,
        type: overlay.type,
      };
    case "text":
      return {
        color: overlay.color,
        fontId: overlay.fontId,
        fontSize: overlay.fontSize,
        pageNumber: overlay.pageNumber,
        rect: overlay.rect,
        text: overlay.text,
        type: overlay.type,
      };
    case "signature":
      return {
        pageNumber: overlay.pageNumber,
        rect: overlay.rect,
        type: overlay.type,
      };
    case "whiteout":
      return {
        color: overlay.color,
        pageNumber: overlay.pageNumber,
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

  if (!isFiniteNumber(value.pageNumber)) {
    return false;
  }

  switch (value.type) {
    case "image":
      return (
        typeof value.assetId === "string" &&
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
        supportedTextFontIds.has(value.fontId as TextFontId) &&
        isFiniteNumber(value.fontSize) &&
        typeof value.text === "string"
      );
    case "signature":
      return true;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function getOverlayClipboardPayloadKey(payload: OverlayClipboardPayload) {
  return `${payload.sourceOverlayId}:${JSON.stringify(payload.overlay)}`;
}

export {
  APP_OVERLAY_MIME_TYPE,
  duplicateOverlayInput,
  getOverlayClipboardPayloadKey,
  getTextFromOverlayPayload,
  isSameOverlayClipboardPayload,
  parseOverlayClipboardPayload,
  serializeOverlayClipboardPayload,
  toOverlayClipboardPayload,
  toOverlayInput,
};
export type { OverlayClipboardPayload };
