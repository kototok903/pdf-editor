import type { PdfRect, ViewportRect } from "@/features/editor/editor-types";

const defaultOverlayHeight = 32;
const defaultOverlayWidth = 140;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export {
  createDefaultOverlayRect,
  createOverlayRectAtPoint,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
};
