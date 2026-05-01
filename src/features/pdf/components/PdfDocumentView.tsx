import { PdfPageView } from "@/features/pdf/components/PdfPageView";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type PdfDocumentViewProps = {
  document: LoadedPdfDocument;
  scale: number;
};

function PdfDocumentView({ document, scale }: PdfDocumentViewProps) {
  return (
    <div className="space-y-7">
      {Array.from({ length: document.pageCount }, (_, index) => (
        <PdfPageView
          key={index + 1}
          pageNumber={index + 1}
          pdfDocument={document.pdfDocument}
          scale={scale}
        />
      ))}
    </div>
  );
}

export { PdfDocumentView };
