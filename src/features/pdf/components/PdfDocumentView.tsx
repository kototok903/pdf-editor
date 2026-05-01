import { PdfPageView } from "@/features/pdf/components/PdfPageView";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import type { EditorOverlay, PdfRect } from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type PdfDocumentViewProps = {
  document: LoadedPdfDocument;
  onClearSelection: () => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  scale: number;
  selectedOverlayId: string | null;
};

function PdfDocumentView({
  document,
  onClearSelection,
  onPageSizeChange,
  onSelectOverlay,
  onUpdateOverlayRect,
  overlays,
  scale,
  selectedOverlayId,
}: PdfDocumentViewProps) {
  return (
    <div className="space-y-7">
      {Array.from({ length: document.pageCount }, (_, index) => (
        <PdfPageView
          key={index + 1}
          onClearSelection={onClearSelection}
          onPageSizeChange={onPageSizeChange}
          onSelectOverlay={onSelectOverlay}
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
