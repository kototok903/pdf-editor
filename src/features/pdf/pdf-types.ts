import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/pdf";

type PdfLoadStatus = "empty" | "loading" | "loaded" | "error";

type PageSize = {
  height: number;
  width: number;
};

type LoadedPdfDocument = {
  bytes: ArrayBuffer;
  fileName: string;
  pageCount: number;
  pdfDocument: PDFDocumentProxy;
};

export type {
  LoadedPdfDocument,
  PageSize,
  PDFDocumentProxy,
  PDFPageProxy,
  PdfLoadStatus,
};
