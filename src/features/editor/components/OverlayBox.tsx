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

  if (overlay.type === "image") {
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
            Missing image
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

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center border bg-primary/10 text-xs font-medium text-primary",
        isSelected
          ? "border-primary ring-2 ring-primary/25"
          : "border-primary/60",
      )}
    >
      {getOverlayLabel(overlay.type)}
    </div>
  );
}

function getOverlayLabel(type: EditorOverlay["type"]) {
  switch (type) {
    case "text":
      return "Text";
    case "image":
      return "Image";
    case "mark":
      return "Mark";
    case "signature":
      return "Sign";
    case "whiteout":
      return "Whiteout";
  }
}

export { OverlayBox };
