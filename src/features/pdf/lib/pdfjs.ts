import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/pdf";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const pdfjsAssetBaseUrl = new URL(
  `${import.meta.env.BASE_URL}pdfjs/`,
  globalThis.location?.href ?? import.meta.url,
).toString();

async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(bytes.slice(0));
  const loadingTask = getDocument({
    cMapPacked: true,
    cMapUrl: `${pdfjsAssetBaseUrl}cmaps/`,
    data,
    iccUrl: `${pdfjsAssetBaseUrl}iccs/`,
    standardFontDataUrl: `${pdfjsAssetBaseUrl}standard_fonts/`,
    wasmUrl: `${pdfjsAssetBaseUrl}wasm/`,
  });

  return loadingTask.promise;
}

export { loadPdfDocument };
