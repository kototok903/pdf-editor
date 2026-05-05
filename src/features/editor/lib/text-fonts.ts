import type { TextFontId } from "@/features/editor/editor-types";

type TextFontOption = {
  cssFontFamily: string;
  id: TextFontId;
  label: string;
};

const textFontOptions: TextFontOption[] = [
  {
    cssFontFamily: "Helvetica, Arial, sans-serif",
    id: "helvetica",
    label: "Helvetica",
  },
  {
    cssFontFamily: "'Times New Roman', Times, serif",
    id: "times-roman",
    label: "Times Roman",
  },
  {
    cssFontFamily: "'Courier New', Courier, monospace",
    id: "courier",
    label: "Courier",
  },
];

function getTextFontFamily(fontId: TextFontId) {
  return (
    textFontOptions.find((fontOption) => fontOption.id === fontId)
      ?.cssFontFamily ?? textFontOptions[0].cssFontFamily
  );
}

export { getTextFontFamily, textFontOptions };
