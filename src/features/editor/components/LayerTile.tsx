import { cn } from "@/lib/utils";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import {
  CheckIcon,
  ImageIcon,
  SignatureIcon,
  SquareIcon,
  TypeIcon,
} from "lucide-react";
import { MarkGlyph } from "@/features/editor/components/MarkGlyph";
import { getTextFontFamily } from "@/features/editor/lib/text-fonts";

const TYPE_ICON_STROKE_WIDTH = 2.5;

function LayerTile({
  imageAssets,
  isSelected,
  onClick,
  overlay,
}: {
  imageAssets: ImageAsset[];
  isSelected: boolean;
  onClick: () => void;
  overlay: EditorOverlay;
}) {
  return (
    <button
      aria-label={getLayerTileLabel(overlay)}
      aria-pressed={isSelected}
      className={cn(
        "relative block size-16 overflow-hidden rounded-md border-2 border-border bg-page/70 text-page-foreground shadow-sm transition-colors",
        isSelected && "border-primary",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="grid size-full place-items-center">
        <OverlayPreview imageAssets={imageAssets} overlay={overlay} side={64} />
      </div>
      <span
        className={cn(
          "absolute right-0 bottom-0 grid size-5 place-items-center rounded-tl-lg -mr-px -mb-px ring-2 text-[10px] font-semibold leading-none",
          isSelected
            ? "bg-primary text-primary-foreground ring-primary"
            : "bg-toolbar-button text-toolbar-foreground ring-border",
        )}
      >
        <LayerTypeIcon overlay={overlay} />
      </span>
    </button>
  );
}

function getLayerTileLabel(overlay: EditorOverlay) {
  return `Select ${overlay.type} overlay`;
}

function OverlayPreview({
  imageAssets,
  overlay,
  side,
}: {
  imageAssets: ImageAsset[];
  overlay: EditorOverlay;
  side: number;
}) {
  switch (overlay.type) {
    case "text": {
      return (
        <div
          className="break-all text-wrap leading-none text-center"
          style={{
            color: overlay.color,
            fontFamily: getTextFontFamily(overlay.fontId),
            fontSize: overlay.fontSize,
            fontSynthesisWeight: "none",
          }}
        >
          {overlay.text}
        </div>
      );
    }
    case "image": {
      const asset = imageAssets.find(
        (imageAsset) => imageAsset.id === overlay.assetId,
      );
      return asset ? (
        <img
          alt={asset.name}
          className="size-full min-h-0 min-w-0 object-contain shadow-glow"
          draggable={false}
          src={asset.objectUrl}
        />
      ) : null;
    }
    case "mark": {
      return (
        <MarkGlyph
          className="size-full"
          color={overlay.color}
          markType={overlay.markType}
        />
      );
    }
    case "whiteout": {
      // scale rectangle to fit within a square
      let width = overlay.rect.width;
      let height = overlay.rect.height;
      if (width > side || height > side) {
        if (width > height) {
          height = (side * height) / width;
          width = side;
        } else {
          width = (side * width) / height;
          height = side;
        }
      }
      return (
        <div
          className="object-contain shadow-glow"
          style={{
            backgroundColor: overlay.color,
            width,
            height,
          }}
        />
      );
    }
    default: {
      return <div className="h-full w-full" />;
    }
  }
}

function LayerTypeIcon({ overlay }: { overlay: EditorOverlay }) {
  switch (overlay.type) {
    case "text":
      return (
        <TypeIcon
          aria-hidden="true"
          strokeWidth={TYPE_ICON_STROKE_WIDTH}
          className="size-3"
        />
      );
    case "image":
      return (
        <ImageIcon
          aria-hidden="true"
          strokeWidth={TYPE_ICON_STROKE_WIDTH}
          className="size-3"
        />
      );
    case "mark":
      return (
        <CheckIcon
          aria-hidden="true"
          strokeWidth={TYPE_ICON_STROKE_WIDTH}
          className="size-3"
        />
      );
    case "signature":
      return (
        <SignatureIcon
          aria-hidden="true"
          strokeWidth={TYPE_ICON_STROKE_WIDTH}
          className="size-3"
        />
      );
    case "whiteout":
      return (
        <SquareIcon
          aria-hidden="true"
          strokeWidth={TYPE_ICON_STROKE_WIDTH}
          className="size-3"
        />
      );
    default:
      throw new Error(`Unknown overlay type: ${overlay satisfies never}`);
  }
}

export { LayerTile };
