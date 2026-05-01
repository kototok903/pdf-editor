import type { OverlayType } from "@/features/editor/editor-types";
import { cn } from "@/lib/utils";

type OverlayBoxProps = {
  isSelected: boolean;
  type: OverlayType;
};

function OverlayBox({ isSelected, type }: OverlayBoxProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center border bg-primary/10 text-xs font-medium text-primary",
        isSelected
          ? "border-primary ring-2 ring-primary/25"
          : "border-primary/60",
      )}
    >
      {getOverlayLabel(type)}
    </div>
  );
}

function getOverlayLabel(type: OverlayType) {
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
