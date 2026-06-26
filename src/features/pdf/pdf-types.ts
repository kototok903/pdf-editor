import type {
  PDFDocumentProxy as PdfJsPDFDocumentProxy,
  PDFPageProxy as PdfJsPDFPageProxy,
} from "pdfjs-dist/types/src/pdf";

export type PDFDocumentProxy = PdfJsPDFDocumentProxy;

export type PDFPageProxy = PdfJsPDFPageProxy;

export type PdfLoadStatus = "empty" | "loading" | "loaded" | "error";

export type PageSize = {
  height: number;
  width: number;
};

export type LoadedPdfDocument = {
  bytes: ArrayBuffer;
  fileName: string;
  pageCount: number;
  pdfDocument: PDFDocumentProxy;
};
