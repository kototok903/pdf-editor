import type { PdfRect, ViewportRect } from "@/features/editor/editor-types";

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
    height: 44,
    width: 140,
    x: Math.max(24, pageSize.width * 0.12),
    y: Math.max(24, pageSize.height * 0.12),
  };
}

export {
  createDefaultOverlayRect,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
};
