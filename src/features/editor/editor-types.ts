type OverlayType = "text" | "image" | "mark" | "signature" | "whiteout";
type MarkType = "ballot-x" | "check" | "dot" | "heavy-check" | "slash-x" | "x";
type TextFontId = "courier" | "helvetica" | "times-roman";

type PdfRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type BaseOverlay = {
  id: string;
  pageNumber: number;
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
  source: "clipboard" | "upload" | "url";
  width: number;
};

type ImageOverlay = BaseOverlay & {
  assetId: string;
  sha256Signature: string;
  type: "image";
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
  type: Exclude<OverlayType, "text" | "image" | "mark" | "whiteout">;
};

type EditorOverlay =
  | TextOverlay
  | ImageOverlay
  | MarkOverlay
  | WhiteoutOverlay
  | BasicOverlay;

type EditorOverlayInput =
  | Omit<TextOverlay, "id">
  | Omit<ImageOverlay, "id">
  | Omit<MarkOverlay, "id">
  | Omit<WhiteoutOverlay, "id">
  | {
      pageNumber: number;
      rect: PdfRect;
      type: BasicOverlay["type"];
    };

type TextOverlayPatch = Partial<
  Pick<TextOverlay, "color" | "fontId" | "fontSize" | "text">
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

export type {
  EditorOverlay,
  EditorOverlayInput,
  ImageAsset,
  ImageOverlay,
  MarkOverlay,
  MarkOverlayPatch,
  MarkType,
  OverlayType,
  PdfRect,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  TextFontId,
  ViewportRect,
  WhiteoutOverlay,
  WhiteoutOverlayDefaults,
  WhiteoutOverlayPatch,
};
