// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import {
  cleanupPdfPageResources,
  cleanupPdfRender,
  releaseCanvasBitmap,
} from "@/features/pdf/lib/pdf-render-cleanup";
import type { PDFPageProxy } from "@/features/pdf/pdf-types";

describe("releaseCanvasBitmap", () => {
  it("drops the canvas backing bitmap without changing CSS sizing", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    canvas.style.width = "160px";
    canvas.style.height = "120px";

    releaseCanvasBitmap(canvas);

    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(canvas.style.width).toBe("160px");
    expect(canvas.style.height).toBe("120px");
  });
});

describe("cleanupPdfRender", () => {
  it("cancels rendering, releases the canvas bitmap, and cleans the page after render settles", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const cleanup = vi.fn();
    const cancel = vi.fn();
    let resolveRender: () => void = () => {};
    const renderPromise = new Promise<void>((resolve) => {
      resolveRender = resolve;
    });

    cleanupPdfRender({
      canvas,
      page: { cleanup } as unknown as PDFPageProxy,
      renderTask: {
        cancel,
        promise: renderPromise,
      },
    });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(cleanup).not.toHaveBeenCalled();

    resolveRender();
    await renderPromise;
    await Promise.resolve();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("cleanupPdfPageResources", () => {
  it("cleans page resources without requiring a render task", () => {
    const cleanup = vi.fn();

    cleanupPdfPageResources({ cleanup } as unknown as PDFPageProxy);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
