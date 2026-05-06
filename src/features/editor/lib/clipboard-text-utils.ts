import type {
  EditorOverlayInput,
  TextFontId,
  TextOverlayDefaults,
} from "@/features/editor/editor-types";
import { createDefaultOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";

type ClipboardTextOptions = {
  pageNumber: number;
  pageSize: { height: number; width: number };
  textSettings: TextOverlayDefaults;
};

function textOverlayInputFromPlainText(
  text: string,
  options: ClipboardTextOptions,
): EditorOverlayInput | null {
  return textOverlayInputUsingCurrentSettings(text, options);
}

function textOverlayInputUsingCurrentSettings(
  text: string,
  options: ClipboardTextOptions,
): EditorOverlayInput | null {
  const normalizedText = normalizeClipboardText(text);

  if (!normalizedText) {
    return null;
  }

  return {
    ...options.textSettings,
    pageNumber: options.pageNumber,
    rect: createDefaultOverlayRect(options.pageSize),
    text: normalizedText,
    type: "text",
  };
}

function textOverlayInputFromHtml(
  html: string,
  fallbackText: string,
  options: ClipboardTextOptions,
): EditorOverlayInput | null {
  const text = normalizeClipboardText(
    extractTextFromHtml(html) || fallbackText,
  );

  if (!text) {
    return null;
  }

  const styles = extractSupportedStylesFromHtml(html);

  return {
    ...options.textSettings,
    ...styles,
    pageNumber: options.pageNumber,
    rect: createDefaultOverlayRect(options.pageSize),
    text,
    type: "text",
  };
}

function extractPlainTextFromHtml(html: string) {
  return normalizeClipboardText(extractTextFromHtml(html));
}

function extractTextFromHtml(html: string) {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(html, "text/html");

    return document.body.textContent ?? "";
  }

  return html.replace(/<[^>]*>/g, " ");
}

function extractSupportedStylesFromHtml(html: string) {
  const styles: Partial<TextOverlayDefaults> = {};
  const styleText = findFirstStyleText(html);

  if (!styleText) {
    return styles;
  }

  const color = getCssDeclaration(styleText, "color");
  const fontSize = parseCssFontSize(getCssDeclaration(styleText, "font-size"));
  const fontId = mapCssFontFamilyToTextFontId(
    getCssDeclaration(styleText, "font-family"),
  );

  if (color) {
    styles.color = normalizeCssColor(color);
  }

  if (fontSize) {
    styles.fontSize = fontSize;
  }

  if (fontId) {
    styles.fontId = fontId;
  }

  return styles;
}

function findFirstStyleText(html: string) {
  if (typeof DOMParser === "undefined") {
    const match = html.match(/\sstyle=(?:"([^"]*)"|'([^']*)')/i);

    return match?.[1] ?? match?.[2] ?? null;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const styledElement = document.body.querySelector<HTMLElement>("[style]");

  return styledElement?.getAttribute("style") ?? null;
}

function getCssDeclaration(styleText: string, property: string) {
  const declarations = styleText.split(";");

  for (const declaration of declarations) {
    const [name, ...valueParts] = declaration.split(":");

    if (name?.trim().toLowerCase() === property) {
      return valueParts.join(":").trim();
    }
  }

  return "";
}

function parseCssFontSize(fontSize: string) {
  const match = fontSize.match(/^([\d.]+)px$/);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);

  return Number.isFinite(value) && value > 0 ? value : null;
}

function mapCssFontFamilyToTextFontId(fontFamily: string): TextFontId | null {
  const normalized = fontFamily.toLowerCase();

  if (normalized.includes("courier") || normalized.includes("mono")) {
    return "courier";
  }

  if (
    normalized.includes("times") ||
    normalized.includes("serif") ||
    normalized.includes("georgia")
  ) {
    return "times-roman";
  }

  if (
    normalized.includes("helvetica") ||
    normalized.includes("arial") ||
    normalized.includes("sans")
  ) {
    return "helvetica";
  }

  return null;
}

function normalizeClipboardText(text: string) {
  return text.replace(/\r\n?/g, "\n").trim();
}

function normalizeCssColor(color: string) {
  const rgbMatch = color.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i,
  );

  if (!rgbMatch) {
    return color;
  }

  return `#${rgbMatch
    .slice(1, 4)
    .map((part) => clampColorPart(Number(part)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function clampColorPart(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

export {
  extractPlainTextFromHtml,
  textOverlayInputFromHtml,
  textOverlayInputFromPlainText,
  textOverlayInputUsingCurrentSettings,
};
