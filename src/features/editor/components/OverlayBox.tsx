import type { EditorOverlay } from "@/features/editor/editor-types";
import { TextOverlayContent } from "@/features/editor/components/TextOverlayContent";
import { cn } from "@/lib/utils";

type OverlayBoxProps = {
  isEditing: boolean;
  isSelected: boolean;
  onTextChange: (overlayId: string, text: string) => void;
  overlay: EditorOverlay;
  scale: number;
};

function OverlayBox({
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
