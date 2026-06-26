import { memo, type ComponentProps, type RefCallback } from "react";

import { PdfPageThumbnail } from "@/features/editor/components/PdfPageThumbnail";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";
import { cn } from "@/lib/utils";

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
};

const PageThumbnailButton = memo(function PageThumbnailButton({
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
      <span
        className={cn(
          "absolute right-0 bottom-0 min-w-5 rounded-tl-lg px-1 py-0.5 -mr-px -mb-px text-center text-xs leading-none font-semibold ring-2",
          isHighlighted
            ? "bg-primary text-primary-foreground ring-primary"
            : "bg-toolbar-button text-toolbar-foreground ring-border",
        )}
      >
        {pageNumber}
      </span>
      {pageRotationDegrees !== 0 && (
        <span className="absolute bottom-0 left-0 rounded-tr-lg bg-toolbar-button px-1 py-0.5 -mb-px -ml-px text-[10px] leading-none font-semibold text-toolbar-foreground ring-2 ring-border">
          {pageRotationDegrees} deg
        </span>
      )}
    </button>
  );
});

PageThumbnailButton.displayName = "PageThumbnailButton";

export { PageThumbnailButton };
