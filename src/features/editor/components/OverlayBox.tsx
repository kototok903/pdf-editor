import { memo } from "react";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { MarkGlyph } from "@/features/editor/components/MarkGlyph";
import { TextOverlayContent } from "@/features/editor/components/TextOverlayContent";
import { cn } from "@/lib/utils";

type OverlayBoxProps = {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isEditing: boolean;
  isSelected: boolean;
  onTextChange: (overlayId: string, text: string) => void;
  overlay: EditorOverlay;
  scale: number;
};

const OverlayBox = memo(function OverlayBox({
  imageAssetById,
  isEditing,
  isSelected,
  onTextChange,
  overlay,
  scale,
}: OverlayBoxProps) {
  if (overlay.type === "text") {
    return (
      <TextOverlayContent
        isEditing={isEditing}
        isSelected={isSelected}
        onTextChange={(text) => onTextChange(overlay.id, text)}
        overlay={overlay}
        scale={scale}
      />
    );
  }

  if (overlay.type === "image" || overlay.type === "signature") {
    const asset = imageAssetById.get(overlay.assetId);

    return (
      <div
        className={cn(
          "h-full w-full overflow-hidden bg-transparent outline -outline-offset-1 outline-transparent",
          !isSelected && "hover:outline-primary/50",
        )}
      >
        {asset ? (
          <img
            alt=""
            className="h-full w-full object-fill"
            draggable={false}
            src={asset.objectUrl}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">
            Missing {overlay.type === "signature" ? "signature" : "image"}
          </div>
        )}
      </div>
    );
  }

  if (overlay.type === "mark") {
    return (
      <div
        className={cn(
          "grid h-full w-full place-items-center overflow-hidden bg-transparent outline -outline-offset-1 outline-transparent",
          !isSelected && "hover:outline-primary/50",
        )}
      >
        <MarkGlyph
          className="h-full w-full"
          color={overlay.color}
          markType={overlay.markType}
        />
      </div>
    );
  }

  if (overlay.type === "whiteout") {
    return (
      <div
        className={cn(
          "h-full w-full outline -outline-offset-1 outline-transparent",
          !isSelected && "hover:outline-primary/50",
        )}
        style={{ backgroundColor: overlay.color }}
      />
    );
  }

  return null;
});

OverlayBox.displayName = "OverlayBox";

export { OverlayBox };
