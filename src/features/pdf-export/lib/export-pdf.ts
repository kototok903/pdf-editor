import {
  LineCapStyle,
  PDFDocument,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type {
  EditorOverlay,
  ImageAsset,
  ImageOverlay,
  MarkOverlay,
  TextFontId,
  TextOverlay,
  WhiteoutOverlay,
} from "@/features/editor/editor-types";
import {
  hexToPdfRgb,
  rectToPdfPageRect,
  textRectToPdfPosition,
} from "@/features/pdf-export/lib/export-coordinate-utils";
import {
  getTextBaselineOffset,
  getTextLineHeight,
  splitTextOverlayLines,
} from "@/features/pdf-export/lib/export-text-utils";

type ExportPdfOptions = {
  imageAssets: ImageAsset[];
  originalPdfBytes: ArrayBuffer;
  overlays: EditorOverlay[];
};

type ExportContext = {
  fontCache: Map<TextFontId, PDFFont>;
  imageAssetsById: Map<string, ImageAsset>;
  imageCache: Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>>>;
  pdfDocument: PDFDocument;
};

async function exportPdf({
  imageAssets,
  originalPdfBytes,
  overlays,
}: ExportPdfOptions) {
  const pdfDocument = await PDFDocument.load(originalPdfBytes);
  const context: ExportContext = {
    fontCache: new Map(),
    imageAssetsById: new Map(
      imageAssets.map((imageAsset) => [imageAsset.id, imageAsset]),
    ),
    imageCache: new Map(),
    pdfDocument,
  };

  const pages = pdfDocument.getPages();

  for (const overlay of overlays) {
    const page = pages[overlay.pageNumber - 1];

    if (!page) {
      continue;
    }

    if (overlay.type === "text") {
      await drawTextOverlay(context, page, overlay);
    } else if (overlay.type === "image") {
      await drawImageOverlay(context, page, overlay);
    } else if (overlay.type === "mark") {
      drawMarkOverlay(page, overlay);
    } else if (overlay.type === "whiteout") {
      drawWhiteoutOverlay(page, overlay);
    }
  }

  return pdfDocument.save();
}

async function drawTextOverlay(
  context: ExportContext,
  page: PDFPage,
  overlay: TextOverlay,
) {
  const { height: pageHeight } = page.getSize();
  const font = await getPdfFont(context, overlay.fontId);
  const baselineOffset = getTextBaselineOffset({
    fontAscent: font.heightAtSize(overlay.fontSize, { descender: false }),
    fontHeight: font.heightAtSize(overlay.fontSize),
    fontSize: overlay.fontSize,
  });
  const position = textRectToPdfPosition(
    overlay.rect,
    pageHeight,
    baselineOffset,
  );
  const lineHeight = getTextLineHeight(overlay.fontSize);
  const lines = splitTextOverlayLines(overlay.text);

  for (const [index, line] of lines.entries()) {
    if (!line) {
      continue;
    }

    page.drawText(line, {
      color: hexToPdfRgb(overlay.color),
      font,
      lineHeight,
      size: overlay.fontSize,
      x: position.x,
      y: position.y - index * lineHeight,
    });
  }
}

async function drawImageOverlay(
  context: ExportContext,
  page: PDFPage,
  overlay: ImageOverlay,
) {
  const asset = context.imageAssetsById.get(overlay.assetId);

  if (!asset) {
    return;
  }

  const image = await getPdfImage(context, asset);
  const { height: pageHeight } = page.getSize();

  page.drawImage(image, rectToPdfPageRect(overlay.rect, pageHeight));
}

function drawMarkOverlay(page: PDFPage, overlay: MarkOverlay) {
  const { height: pageHeight } = page.getSize();
  const color = hexToPdfRgb(overlay.color);
  const markPaths = getMarkSvgPaths(overlay.markType);

  for (const fillPath of markPaths.fills ?? []) {
    page.drawSvgPath(fillPath, {
      color,
      scale: overlay.rect.width / 32,
      x: overlay.rect.x,
      y: pageHeight - overlay.rect.y,
    });
  }

  for (const strokePath of markPaths.strokes ?? []) {
    page.drawSvgPath(strokePath.path, {
      borderColor: color,
      borderLineCap: LineCapStyle.Round,
      borderWidth: strokePath.strokeWidth,
      scale: overlay.rect.width / 32,
      x: overlay.rect.x,
      y: pageHeight - overlay.rect.y,
    });
  }

  for (const line of markPaths.lines ?? []) {
    drawSvgLineSegment(page, overlay.rect, pageHeight, {
      color,
      strokeWidth: line.strokeWidth,
      x1: line.x1,
      x2: line.x2,
      y1: line.y1,
      y2: line.y2,
    });
  }
}

function drawWhiteoutOverlay(page: PDFPage, overlay: WhiteoutOverlay) {
  const { height: pageHeight } = page.getSize();

  page.drawRectangle({
    ...rectToPdfPageRect(overlay.rect, pageHeight),
    color: hexToPdfRgb(overlay.color),
  });
}

function getMarkSvgPaths(markType: MarkOverlay["markType"]) {
  switch (markType) {
    case "ballot-x":
      return {
        strokes: [
          {
            path: "M 8 5.5 H 24 A 2.5 2.5 0 0 1 26.5 8 V 24 A 2.5 2.5 0 0 1 24 26.5 H 8 A 2.5 2.5 0 0 1 5.5 24 V 8 A 2.5 2.5 0 0 1 8 5.5",
            strokeWidth: 2.25,
          },
        ],
        lines: [
          {
            x1: 11,
            x2: 21,
            y1: 11,
            y2: 21,
            strokeWidth: 3,
          },
          {
            x1: 21,
            x2: 11,
            y1: 11,
            y2: 21,
            strokeWidth: 3,
          },
        ],
      };
    case "check":
      return {
        lines: [
          { x1: 6, x2: 12.5, y1: 17.5, y2: 24, strokeWidth: 3.5 },
          { x1: 12.5, x2: 26, y1: 24, y2: 8, strokeWidth: 3.5 },
        ],
      };
    case "dot":
      return {
        fills: [
          "M 21.5 16 C 21.5 19.0376 19.0376 21.5 16 21.5 C 12.9624 21.5 10.5 19.0376 10.5 16 C 10.5 12.9624 12.9624 10.5 16 10.5 C 19.0376 10.5 21.5 12.9624 21.5 16 Z",
        ],
      };
    case "heavy-check":
      return {
        lines: [
          { x1: 5.5, x2: 12.5, y1: 16.5, y2: 24.5, strokeWidth: 5 },
          { x1: 12.5, x2: 27, y1: 24.5, y2: 7.5, strokeWidth: 5 },
        ],
      };
    case "slash-x":
      return {
        lines: [
          { x1: 9, x2: 23, y1: 6, y2: 26, strokeWidth: 3.5 },
          { x1: 23, x2: 9, y1: 6, y2: 26, strokeWidth: 2.25 },
        ],
      };
    case "x":
      return {
        lines: [
          { x1: 8, x2: 24, y1: 7.5, y2: 24.5, strokeWidth: 4 },
          { x1: 24, x2: 8, y1: 7.5, y2: 24.5, strokeWidth: 4 },
        ],
      };
  }
}

function drawSvgLineSegment(
  page: PDFPage,
  rect: MarkOverlay["rect"],
  pageHeight: number,
  options: {
    color: ReturnType<typeof hexToPdfRgb>;
    strokeWidth: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  },
) {
  page.drawLine({
    color: options.color,
    end: svgPointToPdfPoint(rect, pageHeight, options.x2, options.y2),
    lineCap: LineCapStyle.Round,
    start: svgPointToPdfPoint(rect, pageHeight, options.x1, options.y1),
    thickness: svgStrokeWidthToPdfWidth(rect, options.strokeWidth),
  });
}

function svgPointToPdfPoint(
  rect: MarkOverlay["rect"],
  pageHeight: number,
  svgX: number,
  svgY: number,
) {
  return {
    x: rect.x + (svgX / 32) * rect.width,
    y: pageHeight - rect.y - (svgY / 32) * rect.height,
  };
}

function svgStrokeWidthToPdfWidth(
  rect: MarkOverlay["rect"],
  strokeWidth: number,
) {
  return (strokeWidth / 32) * Math.max(rect.width, rect.height);
}

async function getPdfFont(context: ExportContext, fontId: TextFontId) {
  const cachedFont = context.fontCache.get(fontId);

  if (cachedFont) {
    return cachedFont;
  }

  const font = await context.pdfDocument.embedFont(getStandardFont(fontId));
  context.fontCache.set(fontId, font);

  return font;
}

function getStandardFont(fontId: TextFontId) {
  switch (fontId) {
    case "courier":
      return StandardFonts.Courier;
    case "helvetica":
      return StandardFonts.Helvetica;
    case "times-roman":
      return StandardFonts.TimesRoman;
  }
}

async function getPdfImage(context: ExportContext, asset: ImageAsset) {
  const cachedImage = context.imageCache.get(asset.id);

  if (cachedImage) {
    return cachedImage;
  }

  const image =
    getImageExportKind(asset) === "jpg"
      ? await context.pdfDocument.embedJpg(asset.bytes)
      : await context.pdfDocument.embedPng(await getPngImageBytes(asset));

  context.imageCache.set(asset.id, image);

  return image;
}

function getImageExportKind(asset: ImageAsset) {
  if (asset.mimeType === "image/jpeg" || asset.mimeType === "image/jpg") {
    return "jpg";
  }

  return asset.mimeType === "image/png" ? "png" : "rasterize";
}

async function getPngImageBytes(asset: ImageAsset) {
  if (getImageExportKind(asset) === "png") {
    return asset.bytes;
  }

  return rasterizeImageToPngBytes(asset.objectUrl, asset.width, asset.height);
}

async function rasterizeImageToPngBytes(
  objectUrl: string,
  width: number,
  height: number,
) {
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.height = height || image.naturalHeight;
  canvas.width = width || image.naturalWidth;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to prepare this image for export.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to prepare this image for export."));
        return;
      }

      void blob.arrayBuffer().then(resolve, reject);
    }, "image/png");
  });
}

export { exportPdf };
