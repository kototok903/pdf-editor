import type {
  DocumentTextFontId,
  StandardTextFontId,
  TextFontId,
} from "@/features/editor/editor-types";
import helveticaFontUrl from "@/assets/fonts/pdf-standard/texgyreheros-regular.otf?url";
import timesRomanFontUrl from "@/assets/fonts/pdf-standard/texgyretermes-regular.otf?url";
import courierFontUrl from "@/assets/fonts/pdf-standard/texgyrecursor-regular.otf?url";
import {
  getDocumentTextFontId,
  isDocumentTextFontId,
} from "@/features/editor/lib/text-font-id-utils";
import "@/features/editor/lib/text-fonts.css";

type StandardTextFontOption = {
  assetUrl: string;
  cssFontFamily: string;
  id: StandardTextFontId;
  label: string;
  pdfFontName: string;
  source: "standard";
};

type DocumentTextFontOption = {
  cssFontFamily: string;
  id: DocumentTextFontId;
  isComplete: boolean;
  isAvailable: true;
  label: string;
  reason: string | null;
  source: "document";
  sources: DocumentTextFontSource[];
};

type UnavailableDocumentTextFontOption = {
  cssFontFamily: string;
  fontName: string;
  id: DocumentTextFontId;
  isAvailable: false;
  label: string;
  reason: string;
  source: "document";
};

type DocumentTextFontMenuOption =
  | DocumentTextFontOption
  | UnavailableDocumentTextFontOption;

type TextFontOption = DocumentTextFontMenuOption | StandardTextFontOption;

type RegisterDocumentTextFontInput = {
  bytes: ArrayBuffer;
  displayName: string;
  fontName: string;
  mimetype: string | null;
  supportedCodePoints: number[];
};

type UnavailableDocumentTextFontInput = {
  displayName: string;
  fontName: string;
  reason: string;
};

type DocumentTextFontSource = {
  bytes: ArrayBuffer;
  cssFontFamily: string;
  fontName: string;
  mimetype: string | null;
  supportedCodePoints: number[];
};

const requiredTextFontCodePoints = getPrintableAsciiCodePoints();
const textFontOptions: StandardTextFontOption[] = [
  {
    assetUrl: helveticaFontUrl,
    cssFontFamily: "PdfEditorHelvetica, sans-serif",
    id: "helvetica",
    label: "Helvetica",
    pdfFontName: "Helvetica",
    source: "standard",
  },
  {
    assetUrl: timesRomanFontUrl,
    cssFontFamily: "PdfEditorTimesRoman, serif",
    id: "times-roman",
    label: "Times Roman",
    pdfFontName: "Times-Roman",
    source: "standard",
  },
  {
    assetUrl: courierFontUrl,
    cssFontFamily: "PdfEditorCourier, monospace",
    id: "courier",
    label: "Courier",
    pdfFontName: "Courier",
    source: "standard",
  },
];

const documentTextFontFaces = new Map<DocumentTextFontId, FontFace>();
let documentTextFontOptions: DocumentTextFontOption[] = [];

function getTextFontOption(fontId: TextFontId) {
  return getDocumentTextFontOption(fontId) ?? getStandardTextFontOption(fontId);
}

function getTextFontFamily(fontId: TextFontId) {
  return getTextFontOption(fontId).cssFontFamily;
}

function getStandardTextFontOption(fontId: TextFontId) {
  return (
    textFontOptions.find((fontOption) => fontOption.id === fontId) ??
    textFontOptions[0]
  );
}

function getDocumentTextFontOption(fontId: TextFontId) {
  if (!isDocumentTextFontId(fontId)) {
    return null;
  }

  return (
    documentTextFontOptions.find((fontOption) => fontOption.id === fontId) ??
    null
  );
}

async function registerDocumentTextFonts(
  fonts: RegisterDocumentTextFontInput[],
) {
  clearDocumentTextFonts();

  const registeredFonts: DocumentTextFontOption[] = [];
  const fontsByLabel = groupBy(fonts, (font) =>
    normalizeDocumentFontLabel(font.displayName),
  );

  for (const [label, groupedFonts] of fontsByLabel) {
    const id = getDocumentTextFontId(`merged:${label}`);
    const sources: DocumentTextFontSource[] = [];

    for (const font of groupedFonts) {
      const cssFontFamily = getDocumentTextFontCssFamily(font.fontName);
      const fontFace = new FontFace(cssFontFamily, font.bytes.slice(0), {
        display: "block",
        style: "normal",
        weight: "400",
      });

      await fontFace.load();
      document.fonts.add(fontFace);
      documentTextFontFaces.set(getDocumentTextFontId(font.fontName), fontFace);
      sources.push({
        bytes: font.bytes.slice(0),
        cssFontFamily,
        fontName: font.fontName,
        mimetype: font.mimetype,
        supportedCodePoints: font.supportedCodePoints,
      });
    }

    const isComplete = hasRequiredTextGlyphs(sources);

    registeredFonts.push({
      id,
      cssFontFamily: `${sources
        .map((source) => source.cssFontFamily)
        .join(", ")}, sans-serif`,
      isComplete,
      isAvailable: true,
      label,
      reason: isComplete ? null : "Incomplete glyph set",
      source: "document",
      sources,
    });
  }

  documentTextFontOptions = sortDocumentFontOptionsByLabel(registeredFonts);

  return documentTextFontOptions;
}

function createUnavailableDocumentTextFontOptions(
  fonts: UnavailableDocumentTextFontInput[],
): UnavailableDocumentTextFontOption[] {
  const fontsByLabel = groupBy(fonts, (font) =>
    normalizeDocumentFontLabel(font.displayName),
  );

  return sortDocumentFontOptionsByLabel(
    [...fontsByLabel.entries()].map(([label, groupedFonts]) => ({
      cssFontFamily: "inherit",
      fontName: groupedFonts.map((font) => font.fontName).join(","),
      id: getDocumentTextFontId(`unavailable:${label}`),
      isAvailable: false,
      label,
      reason: [...new Set(groupedFonts.map((font) => font.reason))].join(", "),
      source: "document",
    })),
  );
}

function clearDocumentTextFonts() {
  for (const fontFace of documentTextFontFaces.values()) {
    document.fonts.delete(fontFace);
  }

  documentTextFontFaces.clear();
  documentTextFontOptions = [];
}

function getDocumentTextFontCssFamily(fontName: string) {
  return `PdfEditorDocumentFont-${fontName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function normalizeDocumentFontLabel(displayName: string) {
  return displayName.replace(/^[A-Z]{6}\+/, "") || displayName;
}

function hasRequiredTextGlyphs(sources: DocumentTextFontSource[]) {
  const supportedCodePoints = new Set(
    sources.flatMap((source) => source.supportedCodePoints),
  );

  return requiredTextFontCodePoints.every((codePoint) =>
    supportedCodePoints.has(codePoint),
  );
}

function getPrintableAsciiCodePoints() {
  return Array.from({ length: 95 }, (_, index) => index + 32);
}

function sortDocumentFontOptionsByLabel<T extends { label: string }>(
  fontOptions: T[],
) {
  return fontOptions.toSorted((left, right) =>
    left.label.localeCompare(right.label, undefined, {
      sensitivity: "base",
    }),
  );
}

function groupBy<T, K>(values: T[], getKey: (value: T) => K) {
  const groups = new Map<K, T[]>();

  for (const value of values) {
    const key = getKey(value);
    const group = groups.get(key);

    if (group) {
      group.push(value);
    } else {
      groups.set(key, [value]);
    }
  }

  return groups;
}

export {
  clearDocumentTextFonts,
  createUnavailableDocumentTextFontOptions,
  getDocumentTextFontOption,
  getStandardTextFontOption,
  getTextFontFamily,
  getTextFontOption,
  registerDocumentTextFonts,
  textFontOptions,
};
export type {
  DocumentTextFontMenuOption,
  DocumentTextFontOption,
  DocumentTextFontSource,
  RegisterDocumentTextFontInput,
  StandardTextFontOption,
  TextFontOption,
  UnavailableDocumentTextFontOption,
};
