import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/pdf";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(bytes.slice(0));
  const loadingTask = getDocument({ data });

  return loadingTask.promise;
}

export { loadPdfDocument };
