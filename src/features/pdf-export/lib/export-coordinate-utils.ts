import { rgb } from "pdf-lib";

import type { PdfRect } from "@/features/editor/editor-types";

function rectToPdfPageRect(rect: PdfRect, pageHeight: number) {
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: pageHeight - rect.y - rect.height,
  };
}

function textRectToPdfPosition(
  rect: PdfRect,
  pageHeight: number,
  baselineOffset: number,
) {
  return {
    x: rect.x,
    y: pageHeight - rect.y - baselineOffset,
  };
}

function hexToPdfRgb(hexColor: string) {
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

export { hexToPdfRgb, rectToPdfPageRect, textRectToPdfPosition };
