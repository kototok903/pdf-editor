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

type ImageAsset = {
  bytes: ArrayBuffer;
  formatLabel: string;
  height: number;
  id: string;
  isHiddenFromRecents: boolean;
  mimeType: string;
  name: string;
  objectUrl: string;
  source: "upload" | "url";
  width: number;
};

type ImageOverlay = BaseOverlay & {
  assetId: string;
  type: "image";
};

type BasicOverlay = BaseOverlay & {
  type: Exclude<OverlayType, "text" | "image">;
};

type EditorOverlay = TextOverlay | ImageOverlay | BasicOverlay;

type EditorOverlayInput =
  | Omit<TextOverlay, "id">
  | Omit<ImageOverlay, "id">
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
  ImageAsset,
  ImageOverlay,
  OverlayType,
  PdfRect,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  ViewportRect,
};
