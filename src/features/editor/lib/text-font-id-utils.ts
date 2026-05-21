import type {
  DocumentTextFontId,
  StandardTextFontId,
  TextFontId,
} from "@/features/editor/editor-types";

const standardTextFontIds = new Set<StandardTextFontId>([
  "courier",
  "helvetica",
  "times-roman",
]);

function getDocumentTextFontId(fontName: string): DocumentTextFontId {
  return `document:${fontName}`;
}

function isDocumentTextFontId(
  fontId: TextFontId,
): fontId is DocumentTextFontId {
  return fontId.startsWith("document:");
}

function isStandardTextFontId(fontId: string): fontId is StandardTextFontId {
  return standardTextFontIds.has(fontId as StandardTextFontId);
}

function isSupportedTextFontId(fontId: string): fontId is TextFontId {
  return isStandardTextFontId(fontId) || fontId.startsWith("document:");
}

export {
  getDocumentTextFontId,
  isDocumentTextFontId,
  isStandardTextFontId,
  isSupportedTextFontId,
  standardTextFontIds,
};
