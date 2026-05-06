import { PdfPageView } from "@/features/pdf/components/PdfPageView";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import type {
  EditorOverlay,
  ImageAsset,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type PdfDocumentViewProps = {
  activeImageAsset: ImageAsset | null;
  document: LoadedPdfDocument;
  editingOverlayId: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isTextToolActive: boolean;
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
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  scale: number;
  selectedOverlayId: string | null;
};

function PdfDocumentView({
  activeImageAsset,
  document,
  editingOverlayId,
  imageAssets,
  isImageToolActive,
  isMarkToolActive,
  isTextToolActive,
  onClearSelection,
  onEditOverlay,
  onPageElementChange,
  onPageSizeChange,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceTextOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  overlays,
  scale,
  selectedOverlayId,
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
          key={index + 1}
          onClearSelection={onClearSelection}
          onEditOverlay={onEditOverlay}
          onPageElementChange={onPageElementChange}
          onPageSizeChange={onPageSizeChange}
          onPlaceImageOverlay={onPlaceImageOverlay}
          onPlaceMarkOverlay={onPlaceMarkOverlay}
          onPlaceTextOverlay={onPlaceTextOverlay}
          onSelectOverlay={onSelectOverlay}
          onUpdateTextOverlay={onUpdateTextOverlay}
          onUpdateOverlayRect={onUpdateOverlayRect}
          overlays={overlays}
          pageNumber={index + 1}
          pdfDocument={document.pdfDocument}
          scale={scale}
          selectedOverlayId={selectedOverlayId}
        />
      ))}
    </div>
  );
}

export { PdfDocumentView };
