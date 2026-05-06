import { useCallback, useEffect, useRef } from "react";

import { PdfPageThumbnail } from "@/features/editor/components/PdfPageThumbnail";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";
import { cn } from "@/lib/utils";

type PagesSidebarProps = {
  currentPage: number;
  document: LoadedPdfDocument | null;
  imageAssets: ImageAsset[];
  onSelectPage: (pageNumber: number) => void;
  overlays: EditorOverlay[];
  pageCount: number;
};

function PagesSidebar({
  currentPage,
  document,
  imageAssets,
  onSelectPage,
  overlays,
  pageCount,
}: PagesSidebarProps) {
  const pageButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const registerPageButton = useCallback(
    (pageNumber: number, element: HTMLButtonElement | null) => {
      if (element) {
        pageButtonRefs.current.set(pageNumber, element);
        return;
      }

      pageButtonRefs.current.delete(pageNumber);
    },
    [],
  );

  useEffect(() => {
    pageButtonRefs.current.get(currentPage)?.scrollIntoView({
      block: "nearest",
    });
  }, [currentPage]);

  return (
    <aside className="flex h-[calc(100vh-3rem)] w-20 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border p-2">
        <div className="flex items-center justify-between text-xs">
          <span>Page</span>
          <span className="text-muted-foreground">
            {pageCount > 0 ? `${currentPage}/${pageCount}` : "0/0"}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2">
        {pages.length > 0 && document ? (
          pages.map((page) => (
            <SidebarPageButton
              imageAssets={imageAssets}
              isActive={page === currentPage}
              key={page}
              onClick={() => onSelectPage(page)}
              overlays={overlays}
              pageNumber={page}
              pdfDocument={document.pdfDocument}
              registerPageButton={registerPageButton}
            />
          ))
        ) : (
          <div className="h-20 rounded-md border border-dashed bg-page/70" />
        )}
      </div>
    </aside>
  );
}

function SidebarPageButton({
  imageAssets,
  isActive,
  onClick,
  overlays,
  pageNumber,
  pdfDocument,
  registerPageButton,
}: {
  imageAssets: ImageAsset[];
  isActive: boolean;
  onClick: () => void;
  overlays: EditorOverlay[];
  pageNumber: number;
  pdfDocument: LoadedPdfDocument["pdfDocument"];
  registerPageButton: (
    pageNumber: number,
    element: HTMLButtonElement | null,
  ) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const button = buttonRef.current;

    registerPageButton(pageNumber, button);

    return () => {
      registerPageButton(pageNumber, null);
    };
  }, [pageNumber, registerPageButton]);

  return (
    <button
      aria-current={isActive ? "page" : undefined}
      aria-label={`Go to page ${pageNumber}`}
      className="relative mx-auto block overflow-hidden rounded-md border-2 border-border bg-page text-page-foreground shadow-sm transition-colors data-[active=true]:border-primary"
      data-active={isActive}
      onClick={onClick}
      ref={buttonRef}
      type="button"
    >
      <PdfPageThumbnail
        imageAssets={imageAssets}
        overlays={overlays}
        pageNumber={pageNumber}
        pdfDocument={pdfDocument}
      />
      <span
        className={cn(
          "absolute right-0 bottom-0 min-w-5 rounded-tl-lg px-1 py-0.5 -mr-px -mb-px text-center text-xs font-semibold leading-none",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-toolbar-button text-toolbar-foreground ring-2 ring-border",
        )}
      >
        {pageNumber}
      </span>
    </button>
  );
}

export { PagesSidebar };
