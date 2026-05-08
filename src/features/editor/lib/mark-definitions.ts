import type { MarkType } from "@/features/editor/editor-types";
import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";

type MarkDefinition = {
  label: string;
  type: MarkType;
};

const markDefinitions: MarkDefinition[] = [
  { label: "Check", type: "check" },
  { label: "X", type: "x" },
  { label: "Dot", type: "dot" },
  { label: "Ballot X", type: "ballot-x" },
  { label: "Heavy Check", type: "heavy-check" },
  { label: "Slash X", type: "slash-x" },
];
const supportedMarkTypes = new Set<MarkType>(
  markDefinitions.map((definition) => definition.type),
);

const defaultMarkSettings = {
  color: defaultTextOverlay.color,
  markType: "check" as MarkType,
};

function getMarkLabel(markType: MarkType) {
  return (
    markDefinitions.find((definition) => definition.type === markType)?.label ??
    "Mark"
  );
}

function isSupportedMarkType(value: string): value is MarkType {
  return supportedMarkTypes.has(value as MarkType);
}

function createMarkSvgBlob({
  color,
  markType,
}: {
  color: string;
  markType: MarkType;
}) {
  return new Blob([createMarkSvgMarkup({ color, markType })], {
    type: "image/svg+xml",
  });
}

function createMarkSvgMarkup({
  color,
  markType,
}: {
  color: string;
  markType: MarkType;
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="${escapeSvgAttribute(color)}" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 32 32">${getMarkSvgContent(markType, color)}</svg>`;
}

function getMarkSvgContent(markType: MarkType, color: string) {
  switch (markType) {
    case "ballot-x":
      return '<rect height="21" rx="2.5" stroke-width="2.25" width="21" x="5.5" y="5.5" /><path d="M11 11L21 21M21 11L11 21" stroke-width="3" />';
    case "check":
      return '<path d="M6 17.5L12.5 24L26 8" stroke-width="3.5" />';
    case "dot":
      return `<circle cx="16" cy="16" fill="${escapeSvgAttribute(color)}" r="5.5" stroke="none" />`;
    case "heavy-check":
      return '<path d="M5.5 16.5L12.5 24.5L27 7.5" stroke-width="5" />';
    case "slash-x":
      return '<path d="M9 6L23 26" stroke-width="3.5" /><path d="M23 6L9 26" stroke-width="2.25" />';
    case "x":
      return '<path d="M8 7.5L24 24.5" stroke-width="4" /><path d="M24 7.5L8 24.5" stroke-width="4" />';
  }
}

function escapeSvgAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export {
  createMarkSvgBlob,
  createMarkSvgMarkup,
  defaultMarkSettings,
  getMarkLabel,
  isSupportedMarkType,
  markDefinitions,
};
