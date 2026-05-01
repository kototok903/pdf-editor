type OverlayType = "text" | "image" | "mark" | "signature" | "whiteout";

type PdfRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type EditorOverlay = {
  id: string;
  pageNumber: number;
  rect: PdfRect;
  type: OverlayType;
};

type ViewportRect = PdfRect;

export type { EditorOverlay, OverlayType, PdfRect, ViewportRect };
