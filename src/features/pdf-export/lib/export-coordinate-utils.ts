import { rgb } from "pdf-lib";

import type { PdfRect } from "@/features/editor/editor-types";

export function rectToPdfPageRect(rect: PdfRect, pageHeight: number) {
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: pageHeight - rect.y - rect.height,
  };
}

export function rotatedRectToPdfPageImageOptions(
  rect: PdfRect,
  pageHeight: number,
  rotationDegrees: number,
) {
  const pdfRotationDegrees = -rotationDegrees;
  const radians = (pdfRotationDegrees * Math.PI) / 180;
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const centerX = rect.x + halfWidth;
  const centerY = pageHeight - rect.y - halfHeight;
  const rotatedCenterOffsetX =
    Math.cos(radians) * halfWidth - Math.sin(radians) * halfHeight;
  const rotatedCenterOffsetY =
    Math.sin(radians) * halfWidth + Math.cos(radians) * halfHeight;

  return {
    height: rect.height,
    rotationDegrees: pdfRotationDegrees,
    width: rect.width,
    x: centerX - rotatedCenterOffsetX,
    y: centerY - rotatedCenterOffsetY,
  };
}

export function textRectToPdfPosition(
  rect: PdfRect,
  pageHeight: number,
  baselineOffset: number,
) {
  return {
    x: rect.x,
    y: pageHeight - rect.y - baselineOffset,
  };
}

export function hexToPdfRgb(hexColor: string) {
  const normalizedHex = hexColor.trim().replace(/^#/, "");
  const fallback = [0, 0, 0] as const;
  const parts =
    normalizedHex.length === 6
      ? [
          Number.parseInt(normalizedHex.slice(0, 2), 16),
          Number.parseInt(normalizedHex.slice(2, 4), 16),
          Number.parseInt(normalizedHex.slice(4, 6), 16),
        ]
      : fallback;

  if (parts.some((part) => Number.isNaN(part))) {
    return rgb(0, 0, 0);
  }

  return rgb(parts[0] / 255, parts[1] / 255, parts[2] / 255);
}
