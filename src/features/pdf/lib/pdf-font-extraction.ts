import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

type ExtractPdfFontsOptions = {
  pageCount: number;
  pdfDocument: PDFDocumentProxy;
  signal?: AbortSignal;
};

type ExtractedPdfFont = {
  bytes: ArrayBuffer | null;
  canEmbedWithPdfLib: boolean;
  canLoadInBrowser: boolean;
  displayName: string;
  fontName: string;
  hasRequiredTextGlyphs: boolean;
  isType3Font: boolean;
  mimetype: string | null;
  missingFile: boolean;
  supportedCodePoints: number[];
};

type AvailablePdfFont = ExtractedPdfFont & {
  bytes: ArrayBuffer;
  canEmbedWithPdfLib: true;
  canLoadInBrowser: true;
  isType3Font: false;
  missingFile: false;
};

type PdfJsFontObject = {
  data?: Uint8Array | null;
  isType3Font?: boolean;
  loadedName?: string | null;
  mimetype?: string | null;
  missingFile?: boolean;
  name?: string | null;
};

type PdfTextItemWithFont = {
  fontName: string;
};

type PdfJsCommonObjects = {
  get: (fontName: string, callback?: (value: unknown) => void) => unknown;
};

const requiredTextFontCodePoints = getPrintableAsciiCodePoints();

async function extractPdfFonts({
  pageCount,
  pdfDocument,
  signal,
}: ExtractPdfFontsOptions) {
  const extractedFonts = new Map<string, ExtractedPdfFont>();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    if (signal?.aborted) {
      return [];
    }

    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();

    await page.getOperatorList();

    for (const item of textContent.items) {
      if (!isPdfTextItemWithFont(item) || extractedFonts.has(item.fontName)) {
        continue;
      }

      const pdfJsFont = await readPdfJsFontObject(
        page.commonObjs,
        item.fontName,
      );
      const extractedFont = await createExtractedPdfFont(
        item.fontName,
        pdfJsFont,
      );

      extractedFonts.set(item.fontName, extractedFont);
    }
  }

  return [...extractedFonts.values()];
}

function getAvailablePdfFonts(fonts: ExtractedPdfFont[]): AvailablePdfFont[] {
  return fonts.filter(isAvailablePdfFont);
}

function getUnavailablePdfFonts(fonts: ExtractedPdfFont[]) {
  return fonts
    .filter((font) => !isAvailablePdfFont(font))
    .map((font) => ({
      displayName: font.displayName,
      fontName: font.fontName,
      reason: getUnavailablePdfFontReason(font),
    }));
}

async function createExtractedPdfFont(
  fontName: string,
  pdfJsFont: PdfJsFontObject | null,
): Promise<ExtractedPdfFont> {
  const data = pdfJsFont?.data ?? null;
  const bytes = data ? copyUint8ArrayToArrayBuffer(data) : null;
  const [canLoadInBrowser, canEmbedWithPdfLib, supportedCodePoints] =
    await Promise.all([
      validateBrowserFont(fontName, bytes),
      validatePdfLibFont(bytes),
      readSupportedCodePoints(bytes),
    ]);
  const supportedCodePointSet = new Set(supportedCodePoints);
  const hasRequiredTextGlyphs = requiredTextFontCodePoints.every((codePoint) =>
    supportedCodePointSet.has(codePoint),
  );

  return {
    bytes,
    canEmbedWithPdfLib,
    canLoadInBrowser,
    displayName: pdfJsFont?.name || pdfJsFont?.loadedName || fontName,
    fontName,
    hasRequiredTextGlyphs,
    isType3Font: Boolean(pdfJsFont?.isType3Font),
    mimetype: pdfJsFont?.mimetype ?? null,
    missingFile: Boolean(pdfJsFont?.missingFile),
    supportedCodePoints,
  };
}

async function validateBrowserFont(
  fontName: string,
  bytes: ArrayBuffer | null,
) {
  if (!bytes || !("FontFace" in globalThis)) {
    return false;
  }

  try {
    const fontFace = new FontFace(
      `PdfEditorFontValidation-${fontName}`,
      bytes.slice(0),
    );

    await fontFace.load();

    return fontFace.status === "loaded";
  } catch {
    return false;
  }
}

async function validatePdfLibFont(bytes: ArrayBuffer | null) {
  if (!bytes) {
    return false;
  }

  try {
    const [{ default: fontkit }, { PDFDocument }] = await Promise.all([
      import("@pdf-lib/fontkit"),
      import("pdf-lib"),
    ]);
    const pdfDocument = await PDFDocument.create();
    pdfDocument.registerFontkit(fontkit);
    await pdfDocument.embedFont(bytes.slice(0), { subset: false });

    return true;
  } catch {
    return false;
  }
}

async function readSupportedCodePoints(bytes: ArrayBuffer | null) {
  if (!bytes) {
    return [];
  }

  try {
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    const font = fontkit.create(new Uint8Array(bytes.slice(0)));

    return [...(font.characterSet ?? [])].sort((left, right) => left - right);
  } catch {
    return [];
  }
}

function readPdfJsFontObject(
  commonObjs: unknown,
  fontName: string,
): Promise<PdfJsFontObject | null> {
  if (
    typeof commonObjs !== "object" ||
    commonObjs === null ||
    !("get" in commonObjs) ||
    typeof commonObjs.get !== "function"
  ) {
    return Promise.resolve(null);
  }

  const pdfJsCommonObjs = commonObjs as PdfJsCommonObjects;

  return new Promise((resolve) => {
    try {
      pdfJsCommonObjs.get(fontName, (value: unknown) => {
        resolve(isPdfJsFontObject(value) ? value : null);
      });
    } catch {
      try {
        const value = pdfJsCommonObjs.get(fontName);
        resolve(isPdfJsFontObject(value) ? value : null);
      } catch {
        resolve(null);
      }
    }
  });
}

function isAvailablePdfFont(font: ExtractedPdfFont): font is AvailablePdfFont {
  return (
    Boolean(font.bytes) &&
    font.canEmbedWithPdfLib &&
    font.canLoadInBrowser &&
    !font.isType3Font &&
    !font.missingFile
  );
}

function getUnavailablePdfFontReason(font: ExtractedPdfFont) {
  if (!font.bytes || font.missingFile) {
    return "Font file unavailable";
  }

  if (font.isType3Font) {
    return "Type3 font";
  }

  if (!font.canLoadInBrowser) {
    return "Cannot load in browser";
  }

  if (!font.canEmbedWithPdfLib) {
    return "Cannot export";
  }

  if (!font.hasRequiredTextGlyphs) {
    return "Incomplete glyph set";
  }

  return "Unavailable";
}

function isPdfJsFontObject(value: unknown): value is PdfJsFontObject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "name" in value || "loadedName" in value || "data" in value;
}

function isPdfTextItemWithFont(value: unknown): value is PdfTextItemWithFont {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "fontName" in value && typeof value.fontName === "string";
}

function copyUint8ArrayToArrayBuffer(value: Uint8Array) {
  const buffer = new ArrayBuffer(value.length);
  const copy = new Uint8Array(buffer);
  copy.set(value);

  return buffer;
}

function getPrintableAsciiCodePoints() {
  return Array.from({ length: 95 }, (_, index) => index + 32);
}

export { extractPdfFonts, getAvailablePdfFonts, getUnavailablePdfFonts };
export type { AvailablePdfFont, ExtractedPdfFont };
