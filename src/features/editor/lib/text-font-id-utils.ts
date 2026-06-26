import type {
  DocumentTextFontId,
  StandardTextFontId,
  TextFontId,
} from "@/features/editor/editor-types";

export const standardTextFontIds = new Set<StandardTextFontId>([
  "courier",
  "helvetica",
  "times-roman",
]);

export function getDocumentTextFontId(fontName: string): DocumentTextFontId {
  return `document:${fontName}`;
}

export function isDocumentTextFontId(
  fontId: TextFontId,
): fontId is DocumentTextFontId {
  return fontId.startsWith("document:");
}

export function isStandardTextFontId(
  fontId: string,
): fontId is StandardTextFontId {
  return standardTextFontIds.has(fontId as StandardTextFontId);
}

export function isSupportedTextFontId(fontId: string): fontId is TextFontId {
  return isStandardTextFontId(fontId) || fontId.startsWith("document:");
}
