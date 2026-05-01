import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/pdf";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data });

  return loadingTask.promise;
}

export { loadPdfDocument };
