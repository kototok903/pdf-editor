import type { PdfRect, ViewportRect } from "@/features/editor/editor-types";

const defaultOverlayHeight = 32;
const defaultOverlayWidth = 140;
const defaultMarkSize = 18;
const maxInitialImageSize = 220;
const minVisibleOverlaySize = 8;
const keyboardNudgeStep = 1;

function pdfRectToViewportRect(rect: PdfRect, scale: number): ViewportRect {
  return {
    height: rect.height * scale,
    width: rect.width * scale,
    x: rect.x * scale,
    y: rect.y * scale,
  };
}

function viewportRectToPdfRect(rect: ViewportRect, scale: number): PdfRect {
  return {
    height: rect.height / scale,
    width: rect.width / scale,
    x: rect.x / scale,
    y: rect.y / scale,
  };
}

function createDefaultOverlayRect(pageSize: {
  height: number;
  width: number;
}): PdfRect {
  return {
    height: defaultOverlayHeight,
    width: defaultOverlayWidth,
    x: Math.max(24, pageSize.width * 0.12),
    y: Math.max(24, pageSize.height * 0.12),
  };
}

function createOverlayRectAtPoint(
  point: { x: number; y: number },
  pageSize: { height: number; width: number },
): PdfRect {
  return {
    height: defaultOverlayHeight,
    width: defaultOverlayWidth,
    x: clamp(point.x, 0, pageSize.width - defaultOverlayWidth),
    y: clamp(
      point.y - defaultOverlayHeight / 2,
      0,
      pageSize.height - defaultOverlayHeight,
    ),
  };
}

function createImageOverlayRectAtPoint(
  point: { x: number; y: number },
  pageSize: { height: number; width: number },
  imageSize: { height: number; width: number },
): PdfRect {
  const safeImageSize = {
    height: imageSize.height > 0 ? imageSize.height : 120,
    width: imageSize.width > 0 ? imageSize.width : 160,
  };
  const scale = Math.min(
    1,
    maxInitialImageSize / Math.max(safeImageSize.height, safeImageSize.width),
  );
  const width = safeImageSize.width * scale;
  const height = safeImageSize.height * scale;

  return {
    height,
    width,
    x: clamp(point.x - width / 2, 0, pageSize.width - width),
    y: clamp(point.y - height / 2, 0, pageSize.height - height),
  };
}

function createMarkOverlayRectAtPoint(
  point: { x: number; y: number },
  pageSize: { height: number; width: number },
): PdfRect {
  return {
    height: defaultMarkSize,
    width: defaultMarkSize,
    x: clamp(
      point.x - defaultMarkSize / 2,
      0,
      pageSize.width - defaultMarkSize,
    ),
    y: clamp(
      point.y - defaultMarkSize / 2,
      0,
      pageSize.height - defaultMarkSize,
    ),
  };
}

function createRectFromDragPoints(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  pageSize: { height: number; width: number },
): ViewportRect {
  const start = {
    x: clamp(startPoint.x, 0, pageSize.width),
    y: clamp(startPoint.y, 0, pageSize.height),
  };
  const end = {
    x: clamp(endPoint.x, 0, pageSize.width),
    y: clamp(endPoint.y, 0, pageSize.height),
  };

  return {
    height: Math.abs(end.y - start.y),
    width: Math.abs(end.x - start.x),
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  };
}

function clampMovedOverlayRect(
  rect: PdfRect,
  pageSize: { height: number; width: number },
): PdfRect {
  return {
    ...rect,
    x: clamp(
      rect.x,
      Math.min(0, minVisibleOverlaySize - rect.width),
      Math.max(0, pageSize.width - minVisibleOverlaySize),
    ),
    y: clamp(
      rect.y,
      Math.min(0, minVisibleOverlaySize - rect.height),
      Math.max(0, pageSize.height - minVisibleOverlaySize),
    ),
  };
}

function nudgeOverlayRect(
  rect: PdfRect,
  direction: "down" | "left" | "right" | "up",
  pageSize: { height: number; width: number },
  scale: number,
): PdfRect {
  const offset = keyboardNudgeStep / scale;

  const nextRect = {
    ...rect,
    x:
      direction === "left"
        ? rect.x - offset
        : direction === "right"
          ? rect.x + offset
          : rect.x,
    y:
      direction === "up"
        ? rect.y - offset
        : direction === "down"
          ? rect.y + offset
          : rect.y,
  };

  return clampMovedOverlayRect(nextRect, pageSize);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export {
  clampMovedOverlayRect,
  createDefaultOverlayRect,
  createImageOverlayRectAtPoint,
  createMarkOverlayRectAtPoint,
  createOverlayRectAtPoint,
  createRectFromDragPoints,
  nudgeOverlayRect,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
};
