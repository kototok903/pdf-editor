import type { TextFontId } from "@/features/editor/editor-types";
import helveticaFontUrl from "@/assets/fonts/pdf-standard/texgyreheros-regular.otf?url";
import timesRomanFontUrl from "@/assets/fonts/pdf-standard/texgyretermes-regular.otf?url";
import courierFontUrl from "@/assets/fonts/pdf-standard/texgyrecursor-regular.otf?url";
import "@/features/editor/lib/text-fonts.css";

type TextFontOption = {
  assetUrl: string;
  cssFontFamily: string;
  id: TextFontId;
  label: string;
  pdfFontName: string;
};

const textFontOptions: TextFontOption[] = [
  {
    assetUrl: helveticaFontUrl,
    cssFontFamily: "PdfEditorHelvetica, sans-serif",
    id: "helvetica",
    label: "Helvetica",
    pdfFontName: "Helvetica",
  },
  {
    assetUrl: timesRomanFontUrl,
    cssFontFamily: "PdfEditorTimesRoman, serif",
    id: "times-roman",
    label: "Times Roman",
    pdfFontName: "Times-Roman",
  },
  {
    assetUrl: courierFontUrl,
    cssFontFamily: "PdfEditorCourier, monospace",
    id: "courier",
    label: "Courier",
    pdfFontName: "Courier",
  },
];

function getTextFontOption(fontId: TextFontId) {
  return (
    textFontOptions.find((fontOption) => fontOption.id === fontId) ??
    textFontOptions[0]
  );
}

function getTextFontFamily(fontId: TextFontId) {
  return getTextFontOption(fontId).cssFontFamily;
}

export { getTextFontFamily, getTextFontOption, textFontOptions };
