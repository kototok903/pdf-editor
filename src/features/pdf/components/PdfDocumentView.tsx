import { PdfPageView } from "@/features/pdf/components/PdfPageView";
import type {
  EditorOverlay,
  ImageAsset,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { isPageInRenderWindow } from "@/features/pdf/lib/pdf-page-size-utils";
import type { LoadedPdfDocument, PageSize } from "@/features/pdf/pdf-types";

type PdfDocumentViewProps = {
  activeImageAsset: ImageAsset | null;
  currentPage: number;
  document: LoadedPdfDocument;
  editingOverlayId: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
  onCancelActiveTool: () => void;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPageElementChange: (
    pageNumber: number,
    element: HTMLElement | null,
  ) => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceWhiteoutOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  pageSizes: Record<number, PageSize>;
  scale: number;
  selectedOverlayId: string | null;
  whiteoutColor: string;
};

function PdfDocumentView({
  activeImageAsset,
  currentPage,
  document,
  editingOverlayId,
  imageAssets,
  isImageToolActive,
  isMarkToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
  onCancelActiveTool,
  onClearSelection,
  onEditOverlay,
  onPageElementChange,
  onPageSizeChange,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceTextOverlay,
  onPlaceWhiteoutOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  overlays,
  pageSizes,
  scale,
  selectedOverlayId,
  whiteoutColor,
}: PdfDocumentViewProps) {
  return (
    <div className="space-y-7">
      {Array.from({ length: document.pageCount }, (_, index) => (
        <PdfPageView
          activeImageAsset={activeImageAsset}
          editingOverlayId={editingOverlayId}
          imageAssets={imageAssets}
          isImageToolActive={isImageToolActive}
          isMarkToolActive={isMarkToolActive}
          isTextToolActive={isTextToolActive}
          isWhiteoutToolActive={isWhiteoutToolActive}
          key={index + 1}
          onCancelActiveTool={onCancelActiveTool}
          onClearSelection={onClearSelection}
          onEditOverlay={onEditOverlay}
          onPageElementChange={onPageElementChange}
          onPageSizeChange={onPageSizeChange}
          onPlaceImageOverlay={onPlaceImageOverlay}
          onPlaceMarkOverlay={onPlaceMarkOverlay}
          onPlaceTextOverlay={onPlaceTextOverlay}
          onPlaceWhiteoutOverlay={onPlaceWhiteoutOverlay}
          onSelectOverlay={onSelectOverlay}
          onUpdateTextOverlay={onUpdateTextOverlay}
          onUpdateOverlayRect={onUpdateOverlayRect}
          overlays={overlays}
          pageSize={pageSizes[index + 1] ?? getDefaultPageSize(scale)}
          pageNumber={index + 1}
          pdfDocument={document.pdfDocument}
          scale={scale}
          selectedOverlayId={selectedOverlayId}
          shouldRender={isPageInRenderWindow({
            currentPage,
            overscan: workspacePageRenderOverscan,
            pageNumber: index + 1,
          })}
          whiteoutColor={whiteoutColor}
        />
      ))}
    </div>
  );
}

const workspacePageRenderOverscan = 5;
const defaultPageWidth = 612;
const defaultPageHeight = 792;

function getDefaultPageSize(scale: number): PageSize {
  return {
    height: defaultPageHeight * scale,
    width: defaultPageWidth * scale,
  };
}

export { PdfDocumentView };
