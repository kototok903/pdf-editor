import fontkit from "@pdf-lib/fontkit";
import {
  degrees,
  LineCapStyle,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFString,
  type PDFFont,
  type PDFPage,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";

import type {
  EditorFormEdits,
  EditorOverlay,
  DocumentPage,
  ImageAsset,
  ImageOverlay,
  MarkOverlay,
  SignatureOverlay,
  TextFontId,
  TextOverlay,
  WhiteoutOverlay,
} from "@/features/editor/editor-types";
import {
  getStandardTextFontOption,
  type DocumentTextFontOption,
  type DocumentTextFontSource,
} from "@/features/editor/lib/text-fonts";
import type { PdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";
import { standardMetadataInfoKeys } from "@/features/pdf/lib/pdf-metadata";
import {
  hexToPdfRgb,
  rectToPdfPageRect,
  rotatedRectToPdfPageImageOptions,
  textRectToPdfPosition,
} from "@/features/pdf-export/lib/export-coordinate-utils";
import {
  getTextBaselineOffset,
  getTextLineHeight,
  wrapTextOverlayLines,
} from "@/features/pdf-export/lib/export-text-utils";

type ExportPdfOptions = {
  documentPages?: DocumentPage[];
  documentFonts?: DocumentTextFontOption[];
  flattenForms?: boolean;
  formEdits?: EditorFormEdits;
  formFontBytes?: ArrayBuffer;
  imageAssets: ImageAsset[];
  metadata?: PdfProjectMetadata | null;
  originalPdfBytes: ArrayBuffer;
  overlays: EditorOverlay[];
};

type ExportContext = {
  documentFontsById: Map<TextFontId, DocumentTextFontOption>;
  fontCache: Map<string, PDFFont>;
  fontkitRegistered: boolean;
  imageAssetsById: Map<string, ImageAsset>;
  imageCache: Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>>>;
  pdfDocument: PDFDocument;
};

const exportedPdfProducer = "PDF Editor by kototok903";

async function exportPdf({
  documentPages = [],
  documentFonts = [],
  flattenForms = false,
  formEdits = { values: [] },
  formFontBytes,
  imageAssets,
  metadata = null,
  originalPdfBytes,
  overlays,
}: ExportPdfOptions) {
  const pdfDocument = await PDFDocument.load(originalPdfBytes, {
    updateMetadata: false,
  });
  applyPdfMetadata(pdfDocument, metadata);
  pdfDocument.setModificationDate(new Date());

  const context: ExportContext = {
    documentFontsById: new Map(
      documentFonts.map((fontOption) => [fontOption.id, fontOption]),
    ),
    fontCache: new Map(),
    fontkitRegistered: false,
    imageAssetsById: new Map(
      imageAssets.map((imageAsset) => [imageAsset.id, imageAsset]),
    ),
    imageCache: new Map(),
    pdfDocument,
  };

  const pages = pdfDocument.getPages();
  const pageIndexById = new Map(
    documentPages.map((documentPage, index) => [documentPage.id, index]),
  );

  await applyFormEdits(context, formEdits, {
    flattenForms,
    formFontBytes,
  });

  for (const overlay of overlays) {
    const pageIndex = pageIndexById.get(overlay.pageId);
    const page = pageIndex === undefined ? null : pages[pageIndex];

    if (!page) {
      continue;
    }

    if (overlay.type === "text") {
      await drawTextOverlay(context, page, overlay);
    } else if (overlay.type === "image" || overlay.type === "signature") {
      await drawImageOverlay(context, page, overlay);
    } else if (overlay.type === "mark") {
      drawMarkOverlay(page, overlay);
    } else if (overlay.type === "whiteout") {
      drawWhiteoutOverlay(page, overlay);
    }
  }

  return pdfDocument.save();
}

function applyPdfMetadata(
  pdfDocument: PDFDocument,
  metadata: PdfProjectMetadata | null,
) {
  if (!metadata) {
    pdfDocument.setProducer(exportedPdfProducer);
    return;
  }

  const info = getOrCreateInfoDict(pdfDocument);

  setMetadataString(info, "Title", metadata.title);
  setMetadataString(info, "Author", metadata.author);
  setMetadataString(info, "Subject", metadata.subject);
  setMetadataString(info, "Keywords", metadata.keywords);
  setMetadataString(info, "Creator", metadata.creator);
  setMetadataLanguage(pdfDocument, metadata.language);

  if (metadata.isProducerOverridden) {
    setMetadataString(info, "Producer", metadata.producer);
  } else {
    pdfDocument.setProducer(exportedPdfProducer);
  }

  if (metadata.trapped) {
    info.set(PDFName.of("Trapped"), PDFName.of(metadata.trapped));
  } else {
    info.delete(PDFName.of("Trapped"));
  }

  const customPropertyKeys = new Set(
    metadata.customProperties.map((property) => property.key.trim()),
  );

  for (const key of info.keys()) {
    const decodedKey = key.decodeText();

    if (
      (decodedKey === "Language" ||
        !standardMetadataInfoKeys.has(decodedKey)) &&
      !customPropertyKeys.has(decodedKey)
    ) {
      info.delete(key);
    }
  }

  for (const property of metadata.customProperties) {
    const key = property.key.trim();

    if (key) {
      setMetadataString(info, key, property.value);
    }
  }
}

function setMetadataLanguage(
  pdfDocument: PDFDocument,
  language: string | null,
) {
  if (language) {
    pdfDocument.catalog.set(PDFName.of("Lang"), PDFString.of(language));
    return;
  }

  pdfDocument.catalog.delete(PDFName.of("Lang"));
}

function getOrCreateInfoDict(pdfDocument: PDFDocument) {
  const infoRef = pdfDocument.context.trailerInfo.Info;
  const existingInfo = infoRef
    ? pdfDocument.context.lookupMaybe(infoRef, PDFDict)
    : undefined;

  if (existingInfo) {
    return existingInfo;
  }

  const info = pdfDocument.context.obj({});

  pdfDocument.context.trailerInfo.Info = pdfDocument.context.register(info);

  return info;
}

function setMetadataString(info: PDFDict, key: string, value: string | null) {
  const name = PDFName.of(key);

  if (value == null) {
    info.delete(name);
    return;
  }

  info.set(name, PDFHexString.fromText(value));
}

async function applyFormEdits(
  context: ExportContext,
  formEdits: EditorFormEdits,
  {
    flattenForms,
    formFontBytes,
  }: {
    flattenForms: boolean;
    formFontBytes?: ArrayBuffer;
  },
) {
  if (formEdits.values.length === 0) {
    return;
  }

  const form = context.pdfDocument.getForm();
  let didApplyFormValue = false;

  for (const value of formEdits.values) {
    const field = form.getFieldMaybe(value.fieldName);

    if (!field || field.isReadOnly()) {
      continue;
    }

    switch (value.type) {
      case "checkbox":
        if (field instanceof PDFCheckBox) {
          if (value.checked) {
            field.check();
          } else {
            field.uncheck();
          }

          didApplyFormValue = true;
        }
        break;
      case "choice":
        if (field instanceof PDFDropdown) {
          if (value.values.length > 0) {
            field.select(value.values);
          } else {
            field.clear();
          }

          didApplyFormValue = true;
        } else if (field instanceof PDFOptionList) {
          if (value.values.length > 0) {
            field.select(value.values);
          } else {
            field.clear();
          }

          didApplyFormValue = true;
        }
        break;
      case "radio":
        if (field instanceof PDFRadioGroup) {
          selectRadioGroupValue(field, value.selectedValue);
          didApplyFormValue = true;
        }
        break;
      case "text":
        if (field instanceof PDFTextField) {
          field.setText(value.value);
          didApplyFormValue = true;
        }
        break;
    }
  }

  if (!didApplyFormValue) {
    return;
  }

  const formFont = await getPdfFormFont(context, formFontBytes);

  form.updateFieldAppearances(formFont);

  if (flattenForms) {
    form.flatten({ updateFieldAppearances: false });
  }
}

function selectRadioGroupValue(
  field: PDFRadioGroup,
  selectedValue: string | null,
) {
  if (!selectedValue) {
    field.clear();
    return;
  }

  const options = field.getOptions();

  if (options.includes(selectedValue)) {
    field.select(selectedValue);
    return;
  }

  const numericOptionIndex = Number.parseInt(selectedValue, 10);

  if (
    Number.isInteger(numericOptionIndex) &&
    String(numericOptionIndex) === selectedValue &&
    options[numericOptionIndex]
  ) {
    field.select(options[numericOptionIndex]);
    return;
  }

  field.select(selectedValue);
}

async function drawTextOverlay(
  context: ExportContext,
  page: PDFPage,
  overlay: TextOverlay,
) {
  const documentFontOption = context.documentFontsById.get(overlay.fontId);

  if (documentFontOption) {
    await drawDocumentTextOverlay(context, page, overlay, documentFontOption);
    return;
  }

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
  const lines = wrapTextOverlayLines({
    measureTextWidth: (text) => font.widthOfTextAtSize(text, overlay.fontSize),
    text: overlay.text,
    width: overlay.rect.width,
  });

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

async function drawDocumentTextOverlay(
  context: ExportContext,
  page: PDFPage,
  overlay: TextOverlay,
  fontOption: DocumentTextFontOption,
) {
  const { height: pageHeight } = page.getSize();
  const primaryFont = await getPdfDocumentFontSource(
    context,
    fontOption,
    fontOption.sources[0],
  );
  const fallbackFont = await getPdfFont(context, "helvetica");
  const baselineOffset = getTextBaselineOffset({
    fontAscent: primaryFont.heightAtSize(overlay.fontSize, {
      descender: false,
    }),
    fontHeight: primaryFont.heightAtSize(overlay.fontSize),
    fontSize: overlay.fontSize,
  });
  const position = textRectToPdfPosition(
    overlay.rect,
    pageHeight,
    baselineOffset,
  );
  const lineHeight = getTextLineHeight(overlay.fontSize);
  const documentFontSourceFonts = new Map<string, PDFFont>();

  for (const source of fontOption.sources) {
    documentFontSourceFonts.set(
      source.fontName,
      await getPdfDocumentFontSource(context, fontOption, source),
    );
  }

  const lines = wrapTextOverlayLines({
    measureTextWidth: (text) =>
      getDocumentTextWidth({
        fallbackFont,
        fontOption,
        fontSize: overlay.fontSize,
        sourceFonts: documentFontSourceFonts,
        text,
      }),
    text: overlay.text,
    width: overlay.rect.width,
  });

  for (const [lineIndex, line] of lines.entries()) {
    if (!line) {
      continue;
    }

    let x = position.x;
    const y = position.y - lineIndex * lineHeight;

    for (const run of splitDocumentFontTextRuns(line, fontOption)) {
      const font = run.source
        ? await getPdfDocumentFontSource(context, fontOption, run.source)
        : fallbackFont;

      page.drawText(run.text, {
        color: hexToPdfRgb(overlay.color),
        font,
        lineHeight,
        size: overlay.fontSize,
        x,
        y,
      });

      x += font.widthOfTextAtSize(run.text, overlay.fontSize);
    }
  }
}

function getDocumentTextWidth({
  fallbackFont,
  fontOption,
  fontSize,
  sourceFonts,
  text,
}: {
  fallbackFont: PDFFont;
  fontOption: DocumentTextFontOption;
  fontSize: number;
  sourceFonts: ReadonlyMap<string, PDFFont>;
  text: string;
}) {
  return splitDocumentFontTextRuns(text, fontOption).reduce((width, run) => {
    const font = run.source
      ? (sourceFonts.get(run.source.fontName) ?? fallbackFont)
      : fallbackFont;

    return width + font.widthOfTextAtSize(run.text, fontSize);
  }, 0);
}

async function drawImageOverlay(
  context: ExportContext,
  page: PDFPage,
  overlay: ImageOverlay | SignatureOverlay,
) {
  const asset = context.imageAssetsById.get(overlay.assetId);

  if (!asset) {
    return;
  }

  const image = await getPdfImage(context, asset);
  const { height: pageHeight } = page.getSize();
  const rotationDegrees = overlay.rotationDegrees ?? 0;

  if (rotationDegrees === 0) {
    page.drawImage(image, rectToPdfPageRect(overlay.rect, pageHeight));
    return;
  }

  const imageOptions = rotatedRectToPdfPageImageOptions(
    overlay.rect,
    pageHeight,
    rotationDegrees,
  );

  page.drawImage(image, {
    height: imageOptions.height,
    rotate: degrees(imageOptions.rotationDegrees),
    width: imageOptions.width,
    x: imageOptions.x,
    y: imageOptions.y,
  });
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

  if (!context.fontkitRegistered) {
    context.pdfDocument.registerFontkit(fontkit);
    context.fontkitRegistered = true;
  }

  const fontOption = getStandardTextFontOption(fontId);
  const fontBytes = await fetch(fontOption.assetUrl).then((response) => {
    if (!response.ok) {
      throw new Error(`Unable to load ${fontOption.label} for export.`);
    }

    return response.arrayBuffer();
  });
  const font = await context.pdfDocument.embedFont(fontBytes, {
    customName: fontOption.pdfFontName,
    subset: false,
  });
  context.fontCache.set(fontId, font);

  return font;
}

async function getPdfFormFont(
  context: ExportContext,
  formFontBytes?: ArrayBuffer,
) {
  const cacheKey = "form:liberation-sans";
  const cachedFont = context.fontCache.get(cacheKey);

  if (cachedFont) {
    return cachedFont;
  }

  if (!context.fontkitRegistered) {
    context.pdfDocument.registerFontkit(fontkit);
    context.fontkitRegistered = true;
  }

  const fontBytes = formFontBytes ?? (await fetchPdfFormFontBytes());
  const font = await context.pdfDocument.embedFont(fontBytes.slice(0), {
    customName: "PDFEditorFormFont",
    subset: false,
  });

  context.fontCache.set(cacheKey, font);

  return font;
}

async function fetchPdfFormFontBytes() {
  const response = await fetch(getPdfFormFontUrl());

  if (!response.ok) {
    throw new Error("Unable to load the form font for export.");
  }

  return response.arrayBuffer();
}

function getPdfFormFontUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}pdfjs/standard_fonts/LiberationSans-Regular.ttf`,
    globalThis.location?.href ?? import.meta.url,
  ).toString();
}

async function getPdfDocumentFontSource(
  context: ExportContext,
  fontOption: DocumentTextFontOption,
  source: DocumentTextFontSource,
) {
  const cacheKey = `${fontOption.id}:${source.fontName}`;
  const cachedFont = context.fontCache.get(cacheKey);

  if (cachedFont) {
    return cachedFont;
  }

  if (!context.fontkitRegistered) {
    context.pdfDocument.registerFontkit(fontkit);
    context.fontkitRegistered = true;
  }

  const font = await context.pdfDocument.embedFont(source.bytes.slice(0), {
    subset: false,
  });

  context.fontCache.set(cacheKey, font);

  return font;
}

function splitDocumentFontTextRuns(
  text: string,
  fontOption: DocumentTextFontOption,
) {
  const runs: { source: DocumentTextFontSource | null; text: string }[] = [];
  let currentSource: DocumentTextFontSource | null | undefined;
  let currentText = "";

  for (const character of text) {
    const source = getDocumentFontSourceForCharacter(fontOption, character);

    if (source !== currentSource) {
      if (currentText) {
        runs.push({ source: currentSource ?? null, text: currentText });
      }

      currentSource = source;
      currentText = character;
    } else {
      currentText += character;
    }
  }

  if (currentText) {
    runs.push({ source: currentSource ?? null, text: currentText });
  }

  return runs;
}

function getDocumentFontSourceForCharacter(
  fontOption: DocumentTextFontOption,
  character: string,
) {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return null;
  }

  return (
    fontOption.sources.find((source) =>
      source.supportedCodePoints.includes(codePoint),
    ) ?? null
  );
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
