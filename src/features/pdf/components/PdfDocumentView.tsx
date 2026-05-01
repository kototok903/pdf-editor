import { PdfPageView } from "@/features/pdf/components/PdfPageView";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import type {
  EditorOverlay,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type PdfDocumentViewProps = {
  document: LoadedPdfDocument;
  editingOverlayId: string | null;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  scale: number;
  selectedOverlayId: string | null;
};

function PdfDocumentView({
  document,
  editingOverlayId,
  onClearSelection,
  onEditOverlay,
  onPageSizeChange,
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
          editingOverlayId={editingOverlayId}
          key={index + 1}
          onClearSelection={onClearSelection}
          onEditOverlay={onEditOverlay}
          onPageSizeChange={onPageSizeChange}
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
