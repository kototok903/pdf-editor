import { describe, expect, it } from "vitest";

import { getPdfDocumentMetadata } from "@/features/pdf/lib/pdf-document-details";
import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

describe("pdf document details", () => {
  it("reads PDF.js custom metadata from the Custom info object", async () => {
    const metadata = await getPdfDocumentMetadata(
      createPdfDocumentProxy({
        Custom: {
          Accessibility: "structured; tagged",
          Language: "en-US",
          "Form fields": "fillable",
        },
        Language: "en-US",
      }),
    );

    expect(metadata.language).toBe("en-US");
    expect(metadata.customProperties).toEqual([
      { key: "Accessibility", value: "structured; tagged" },
      { key: "Form fields", value: "fillable" },
    ]);
  });

  it("reads trapped status from PDF.js name objects", async () => {
    const metadata = await getPdfDocumentMetadata(
      createPdfDocumentProxy({
        Trapped: { name: "True" },
      }),
    );

    expect(metadata.trapped).toBe("True");
  });
});

function createPdfDocumentProxy(info: Record<string, unknown>) {
  return {
    getMetadata: async () => ({ info, metadata: null }),
  } as unknown as PDFDocumentProxy;
}
