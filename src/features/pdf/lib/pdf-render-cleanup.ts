import type { PDFPageProxy } from "@/features/pdf/pdf-types";

type PdfRenderTask = {
  cancel: () => void;
  promise: Promise<unknown>;
};

function releaseCanvasBitmap(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function cleanupPdfPageAfterRender({
  page,
  renderTask,
}: {
  page: PDFPageProxy | null;
  renderTask: PdfRenderTask | null;
}) {
  if (!page) {
    return;
  }

  const cleanupPage = () => {
    try {
      page.cleanup();
    } catch {
      // Cleanup is best-effort; a later document destroy still releases resources.
    }
  };

  if (!renderTask) {
    cleanupPage();
    return;
  }

  void renderTask.promise.then(cleanupPage, cleanupPage);
}

function cleanupPdfRender({
  canvas,
  page,
  renderTask,
}: {
  canvas: HTMLCanvasElement;
  page: PDFPageProxy | null;
  renderTask: PdfRenderTask | null;
}) {
  try {
    renderTask?.cancel();
  } catch {
    // A render task can already be settled by the time React cleans up.
  }

  releaseCanvasBitmap(canvas);
  cleanupPdfPageAfterRender({ page, renderTask });
}

export { cleanupPdfRender, releaseCanvasBitmap };
export type { PdfRenderTask };
