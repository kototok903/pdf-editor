export type OverlayType = "text" | "image" | "mark" | "signature" | "whiteout";
export type MarkType =
  | "ballot-x"
  | "check"
  | "dot"
  | "heavy-check"
  | "slash-x"
  | "x";
export type StandardTextFontId = "courier" | "helvetica" | "times-roman";
export type DocumentTextFontId = `document:${string}`;
export type TextFontId = DocumentTextFontId | StandardTextFontId;

export type PdfRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type DocumentSourceId = string;
export type DocumentPageId = string;

export type DocumentSource = {
  bytes: ArrayBuffer;
  fileName: string;
  id: DocumentSourceId;
  pageCount: number;
};

export type DocumentPage = {
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

export type TextOverlay = BaseOverlay & {
  color: string;
  fontId: TextFontId;
  fontSize: number;
  text: string;
  type: "text";
};

export type ImageAsset = {
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

export type ImageOverlay = BaseOverlay & {
  assetId: string;
  rotationDegrees: number;
  sha256Signature: string;
  type: "image";
};

export type SignatureOverlay = BaseOverlay & {
  assetId: string;
  rotationDegrees: number;
  sha256Signature: string;
  type: "signature";
};

export type MarkOverlay = BaseOverlay & {
  color: string;
  markType: MarkType;
  type: "mark";
};

export type WhiteoutOverlay = BaseOverlay & {
  color: string;
  type: "whiteout";
};

type BasicOverlay = BaseOverlay & {
  type: Exclude<
    OverlayType,
    "text" | "image" | "mark" | "signature" | "whiteout"
  >;
};

export type EditorOverlay =
  | TextOverlay
  | ImageOverlay
  | SignatureOverlay
  | MarkOverlay
  | WhiteoutOverlay
  | BasicOverlay;

export type EditorOverlayInput =
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

export type TextOverlayPatch = Partial<
  Pick<TextOverlay, "color" | "fontId" | "fontSize" | "rect" | "text">
>;
export type MarkOverlayPatch = Partial<Pick<MarkOverlay, "color" | "markType">>;
export type WhiteoutOverlayPatch = Partial<Pick<WhiteoutOverlay, "color">>;

export type TextOverlayDefaults = {
  color: string;
  fontId: TextFontId;
  fontSize: number;
  text: string;
};

export type WhiteoutOverlayDefaults = {
  color: string;
};

export type ViewportRect = PdfRect;

type BasePdfFormValue = {
  fieldName: string;
  pageId: DocumentPageId;
};

export type PdfFormTextValue = BasePdfFormValue & {
  type: "text";
  value: string;
};

export type PdfFormCheckboxValue = BasePdfFormValue & {
  checked: boolean;
  type: "checkbox";
};

export type PdfFormRadioValue = BasePdfFormValue & {
  selectedValue: string | null;
  type: "radio";
};

export type PdfFormChoiceValue = BasePdfFormValue & {
  type: "choice";
  values: string[];
};

export type PdfFormValue =
  | PdfFormTextValue
  | PdfFormCheckboxValue
  | PdfFormRadioValue
  | PdfFormChoiceValue;

export type EditorFormEdits = {
  values: PdfFormValue[];
};
