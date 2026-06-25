type OverlayType = "text" | "image" | "mark" | "signature" | "whiteout";
type MarkType = "ballot-x" | "check" | "dot" | "heavy-check" | "slash-x" | "x";
type StandardTextFontId = "courier" | "helvetica" | "times-roman";
type DocumentTextFontId = `document:${string}`;
type TextFontId = DocumentTextFontId | StandardTextFontId;

type PdfRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type DocumentSourceId = string;
type DocumentPageId = string;

type DocumentSource = {
  bytes: ArrayBuffer;
  fileName: string;
  id: DocumentSourceId;
  pageCount: number;
};

type DocumentPage = {
  id: DocumentPageId;
  rotationDegrees: 0 | 90 | 180 | 270;
  sourceId: DocumentSourceId;
  sourcePageNumber: number;
};

type BaseOverlay = {
  id: string;
  pageId: DocumentPageId;
  rect: PdfRect;
};

type TextOverlay = BaseOverlay & {
  color: string;
  fontId: TextFontId;
  fontSize: number;
  text: string;
  type: "text";
};

type ImageAsset = {
  bytes: ArrayBuffer;
  formatLabel: string;
  height: number;
  id: string;
  isHiddenFromRecents: boolean;
  mimeType: string;
  name: string;
  objectUrl: string;
  sha256Signature: string;
  source: "clipboard" | "signature" | "upload" | "url";
  width: number;
};

type ImageOverlay = BaseOverlay & {
  assetId: string;
  rotationDegrees: number;
  sha256Signature: string;
  type: "image";
};

type SignatureOverlay = BaseOverlay & {
  assetId: string;
  rotationDegrees: number;
  sha256Signature: string;
  type: "signature";
};

type MarkOverlay = BaseOverlay & {
  color: string;
  markType: MarkType;
  type: "mark";
};

type WhiteoutOverlay = BaseOverlay & {
  color: string;
  type: "whiteout";
};

type BasicOverlay = BaseOverlay & {
  type: Exclude<
    OverlayType,
    "text" | "image" | "mark" | "signature" | "whiteout"
  >;
};

type EditorOverlay =
  | TextOverlay
  | ImageOverlay
  | SignatureOverlay
  | MarkOverlay
  | WhiteoutOverlay
  | BasicOverlay;

type EditorOverlayInput =
  | Omit<TextOverlay, "id">
  | (Omit<ImageOverlay, "id" | "rotationDegrees"> &
      Partial<Pick<ImageOverlay, "rotationDegrees">>)
  | (Omit<SignatureOverlay, "id" | "rotationDegrees"> &
      Partial<Pick<SignatureOverlay, "rotationDegrees">>)
  | Omit<MarkOverlay, "id">
  | Omit<WhiteoutOverlay, "id">
  | {
      pageId: DocumentPageId;
      rect: PdfRect;
      type: BasicOverlay["type"];
    };

type TextOverlayPatch = Partial<
  Pick<TextOverlay, "color" | "fontId" | "fontSize" | "rect" | "text">
>;
type MarkOverlayPatch = Partial<Pick<MarkOverlay, "color" | "markType">>;
type WhiteoutOverlayPatch = Partial<Pick<WhiteoutOverlay, "color">>;

type TextOverlayDefaults = {
  color: string;
  fontId: TextFontId;
  fontSize: number;
  text: string;
};

type WhiteoutOverlayDefaults = {
  color: string;
};

type ViewportRect = PdfRect;

type BasePdfFormValue = {
  fieldName: string;
  pageId: DocumentPageId;
};

type PdfFormTextValue = BasePdfFormValue & {
  type: "text";
  value: string;
};

type PdfFormCheckboxValue = BasePdfFormValue & {
  checked: boolean;
  type: "checkbox";
};

type PdfFormRadioValue = BasePdfFormValue & {
  selectedValue: string | null;
  type: "radio";
};

type PdfFormChoiceValue = BasePdfFormValue & {
  type: "choice";
  values: string[];
};

type PdfFormValue =
  | PdfFormTextValue
  | PdfFormCheckboxValue
  | PdfFormRadioValue
  | PdfFormChoiceValue;

type EditorFormEdits = {
  values: PdfFormValue[];
};

export type {
  DocumentPage,
  DocumentPageId,
  DocumentSource,
  DocumentSourceId,
  EditorOverlay,
  EditorFormEdits,
  EditorOverlayInput,
  ImageAsset,
  ImageOverlay,
  MarkOverlay,
  MarkOverlayPatch,
  MarkType,
  OverlayType,
  PdfRect,
  PdfFormCheckboxValue,
  PdfFormChoiceValue,
  PdfFormRadioValue,
  PdfFormTextValue,
  PdfFormValue,
  SignatureOverlay,
  StandardTextFontId,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  DocumentTextFontId,
  TextFontId,
  ViewportRect,
  WhiteoutOverlay,
  WhiteoutOverlayDefaults,
  WhiteoutOverlayPatch,
};
