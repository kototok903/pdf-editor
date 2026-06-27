import {
  type ComponentProps,
  memo,
  type ReactNode,
  type RefCallback,
} from "react";

import { PdfPageThumbnail } from "@/features/editor/components/PdfPageThumbnail";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";
import { cn } from "@/lib/utils";

const CORNERS = ["tl", "tr", "bl", "br"] as const;
type Corner = (typeof CORNERS)[number];

const cornerSlotPositionStyles = {
  tl: "top-0 left-0 rounded-br-lg -mt-px -ml-px",
  tr: "top-0 right-0 rounded-bl-lg -mt-px -mr-px",
  bl: "bottom-0 left-0 rounded-tr-lg -mb-px -ml-px",
  br: "bottom-0 right-0 rounded-tl-lg -mb-px -mr-px",
};

type PageThumbnailButtonProps = Omit<ComponentProps<"button">, "children"> & {
  buttonRef?: RefCallback<HTMLButtonElement>;
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isActive?: boolean;
  isDropTarget?: boolean;
  isSelected?: boolean;
  pageNumber: number;
  pageOverlays: EditorOverlay[];
  pageRotationDegrees?: number;
  pdfDocument: LoadedPdfDocument["pdfDocument"];
  shouldRenderThumbnail: boolean;
  sourcePageNumber: number;
  thumbnailWidth?: number;
  cornerSlots?: {
    [k in Corner]?: ReactNode;
  };
};

export const PageThumbnailButton = memo(function PageThumbnailButton({
  buttonRef,
  className,
  imageAssetById,
  isActive = false,
  isDropTarget = false,
  isSelected = false,
  pageNumber,
  pageOverlays,
  pageRotationDegrees = 0,
  pdfDocument,
  shouldRenderThumbnail,
  sourcePageNumber,
  thumbnailWidth,
  cornerSlots,
  ...props
}: PageThumbnailButtonProps) {
  const isHighlighted = isActive || isSelected;

  return (
    <button
      aria-current={isActive ? "page" : undefined}
      aria-label={`Page ${pageNumber}`}
      className={cn(
        "relative mx-auto block overflow-hidden rounded-md border-2 border-border bg-page text-page-foreground shadow-sm transition-colors data-[active=true]:border-primary",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        isDropTarget && "border-primary ring-2 ring-primary/35",
        className,
      )}
      data-active={isHighlighted}
      data-page-number={pageNumber}
      ref={buttonRef}
      type="button"
      {...props}
    >
      <PdfPageThumbnail
        imageAssetById={imageAssetById}
        pageOverlays={pageOverlays}
        pageRotationDegrees={pageRotationDegrees}
        pdfDocument={pdfDocument}
        shouldRender={shouldRenderThumbnail}
        sourcePageNumber={sourcePageNumber}
        width={thumbnailWidth}
      />
      {cornerSlots &&
        CORNERS.filter(
          (c) => cornerSlots[c] !== undefined && cornerSlots[c] !== null,
        ).map((c) => (
          <span
            key={c}
            className={cn(
              "absolute min-w-5 px-1 py-0.5 text-center text-xs leading-none font-semibold ring-2",
              cornerSlotPositionStyles[c],
              "bg-toolbar-button text-toolbar-foreground ring-border",
              "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:ring-primary",
            )}
            data-active={isHighlighted}
          >
            {cornerSlots[c]}
          </span>
        ))}
    </button>
  );
});

PageThumbnailButton.displayName = "PageThumbnailButton";
