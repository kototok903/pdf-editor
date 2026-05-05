import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/pdf";

type PdfLoadStatus = "empty" | "loading" | "loaded" | "error";

type LoadedPdfDocument = {
  bytes: ArrayBuffer;
  fileName: string;
  pageCount: number;
  pdfDocument: PDFDocumentProxy;
};

export type {
  LoadedPdfDocument,
  PDFDocumentProxy,
  PDFPageProxy,
  PdfLoadStatus,
};
