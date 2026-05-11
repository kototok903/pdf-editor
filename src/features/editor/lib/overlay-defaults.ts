import type {
  TextOverlayDefaults,
  WhiteoutOverlayDefaults,
} from "@/features/editor/editor-types";

const defaultTextOverlay: TextOverlayDefaults = {
  color: "#111827",
  fontId: "helvetica",
  fontSize: 16,
  text: "Text",
};

const defaultWhiteoutOverlay: WhiteoutOverlayDefaults = {
  color: "#ffffff",
};

export { defaultTextOverlay, defaultWhiteoutOverlay };
