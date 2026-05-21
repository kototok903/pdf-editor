import "@fontsource/allura/latin-400.css";
import "@fontsource/caveat-brush/latin-400.css";
import "@fontsource/caveat/latin-400.css";
import "@fontsource/dancing-script/latin-400.css";
import "@fontsource/homemade-apple/latin-400.css";
import "@fontsource/kalam/latin-400.css";
import "@fontsource/patrick-hand/latin-400.css";
import "@fontsource/reenie-beanie/latin-400.css";
import "@fontsource/sacramento/latin-400.css";
import "@fontsource/satisfy/latin-400.css";
import "@fontsource/shadows-into-light/latin-400.css";
import "@fontsource/yellowtail/latin-400.css";

type SignatureFontId =
  | "allura"
  | "caveat"
  | "caveat-brush"
  | "dancing-script"
  | "homemade-apple"
  | "kalam"
  | "patrick-hand"
  | "reenie-beanie"
  | "sacramento"
  | "satisfy"
  | "shadows-into-light"
  | "yellowtail";

type SignatureFontOption = {
  cssFontFamily: string;
  id: SignatureFontId;
  label: string;
};

const signatureFontOptions: SignatureFontOption[] = [
  {
    cssFontFamily: "'Allura', cursive",
    id: "allura",
    label: "Allura",
  },
  {
    cssFontFamily: "'Sacramento', cursive",
    id: "sacramento",
    label: "Sacramento",
  },
  {
    cssFontFamily: "'Satisfy', cursive",
    id: "satisfy",
    label: "Satisfy",
  },
  {
    cssFontFamily: "'Yellowtail', cursive",
    id: "yellowtail",
    label: "Yellowtail",
  },
  {
    cssFontFamily: "'Dancing Script', cursive",
    id: "dancing-script",
    label: "Dancing Script",
  },
  {
    cssFontFamily: "'Caveat', cursive",
    id: "caveat",
    label: "Caveat",
  },
  {
    cssFontFamily: "'Caveat Brush', cursive",
    id: "caveat-brush",
    label: "Caveat Brush",
  },
  {
    cssFontFamily: "'Kalam', cursive",
    id: "kalam",
    label: "Kalam",
  },
  {
    cssFontFamily: "'Homemade Apple', cursive",
    id: "homemade-apple",
    label: "Homemade Apple",
  },
  {
    cssFontFamily: "'Reenie Beanie', cursive",
    id: "reenie-beanie",
    label: "Reenie Beanie",
  },
  {
    cssFontFamily: "'Shadows Into Light', cursive",
    id: "shadows-into-light",
    label: "Shadows Into Light",
  },
  {
    cssFontFamily: "'Patrick Hand', cursive",
    id: "patrick-hand",
    label: "Patrick Hand",
  },
];

function getSignatureFontOption(fontId: SignatureFontId) {
  return (
    signatureFontOptions.find((fontOption) => fontOption.id === fontId) ??
    signatureFontOptions[0]
  );
}

export { getSignatureFontOption, signatureFontOptions };
export type { SignatureFontId, SignatureFontOption };
