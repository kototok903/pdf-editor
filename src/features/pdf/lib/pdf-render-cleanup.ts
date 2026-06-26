import type { PDFPageProxy } from "@/features/pdf/pdf-types";

type PdfRenderTask = {
  cancel: () => void;
  promise: Promise<unknown>;
};

function releaseCanvasBitmap(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function cleanupPdfPageResources(page: PDFPageProxy | null) {
  if (!page) {
    return;
  }

  try {
    page.cleanup();
  } catch {
    // Cleanup is best-effort; a later document destroy still releases resources.
  }
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

  if (!renderTask) {
    cleanupPdfPageResources(page);
    return;
  }

  void renderTask.promise.then(
    () => cleanupPdfPageResources(page),
    () => cleanupPdfPageResources(page),
  );
}

function cleanupPdfRender({
  canvas,
  page,
  releaseCanvas = true,
  renderTask,
}: {
  canvas: HTMLCanvasElement;
  page: PDFPageProxy | null;
  releaseCanvas?: boolean;
  renderTask: PdfRenderTask | null;
}) {
  try {
    renderTask?.cancel();
  } catch {
    // A render task can already be settled by the time React cleans up.
  }

  if (releaseCanvas) {
    releaseCanvasBitmap(canvas);
  }

  cleanupPdfPageAfterRender({ page, renderTask });
}

export { cleanupPdfPageResources, cleanupPdfRender, releaseCanvasBitmap };
export type { PdfRenderTask };
