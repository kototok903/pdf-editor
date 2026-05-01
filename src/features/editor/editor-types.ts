type OverlayType = "text" | "image" | "mark" | "signature" | "whiteout";

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
  fontFamily: string;
  fontSize: number;
  text: string;
  type: "text";
};

type BasicOverlay = BaseOverlay & {
  type: Exclude<OverlayType, "text">;
};

type EditorOverlay = TextOverlay | BasicOverlay;

type EditorOverlayInput =
  | Omit<TextOverlay, "id">
  | {
      pageNumber: number;
      rect: PdfRect;
      type: BasicOverlay["type"];
    };

type TextOverlayPatch = Partial<
  Pick<TextOverlay, "color" | "fontFamily" | "fontSize" | "text">
>;

type TextOverlayDefaults = {
  color: string;
  fontFamily: string;
  fontSize: number;
  text: string;
};

type ViewportRect = PdfRect;

export type {
  EditorOverlay,
  EditorOverlayInput,
  OverlayType,
  PdfRect,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  ViewportRect,
};
