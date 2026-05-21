import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { MarkGlyph } from "@/features/editor/components/MarkGlyph";
import { TextOverlayContent } from "@/features/editor/components/TextOverlayContent";
import { cn } from "@/lib/utils";

type OverlayBoxProps = {
  imageAssets: ImageAsset[];
  isEditing: boolean;
  isSelected: boolean;
  onTextChange: (overlayId: string, text: string) => void;
  overlay: EditorOverlay;
  scale: number;
};

function OverlayBox({
  imageAssets,
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
    const asset = imageAssets.find(
      (imageAsset) => imageAsset.id === overlay.assetId,
    );

    return (
      <div
        className={cn(
          "h-full w-full overflow-hidden border bg-transparent",
          isSelected
            ? "border-primary ring-2 ring-primary/25"
            : "border-transparent hover:border-primary/50",
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
          "grid h-full w-full place-items-center overflow-hidden border bg-transparent",
          isSelected
            ? "border-primary ring-2 ring-primary/25"
            : "border-transparent hover:border-primary/50",
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
          "h-full w-full border",
          isSelected
            ? "border-primary ring-2 ring-primary/25"
            : "border-transparent hover:border-primary/50",
        )}
        style={{ backgroundColor: overlay.color }}
      />
    );
  }

  return null;
}

export { OverlayBox };
