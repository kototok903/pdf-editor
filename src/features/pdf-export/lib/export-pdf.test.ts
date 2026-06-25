import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  StandardFonts,
} from "pdf-lib";

import type { EditorFormEdits } from "@/features/editor/editor-types";
import { exportPdf } from "@/features/pdf-export/lib/export-pdf";

describe("export pdf form fields", () => {
  it("sets the exported PDF producer", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      imageAssets: [],
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes, {
      updateMetadata: false,
    });

    expect(exportedPdf.getProducer()).toBe("PDF Editor by kototok903");
  });

  it("applies editable PDF metadata and updates modification date", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      imageAssets: [],
      metadata: {
        author: "Ada Lovelace",
        creator: "Forms App",
        customProperties: [],
        isProducerOverridden: false,
        keywords: "math computing",
        language: "en-US",
        producer: "Original Producer",
        subject: "Research",
        title: "Notes",
        trapped: null,
      },
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes, {
      updateMetadata: false,
    });

    expect(exportedPdf.getTitle()).toBe("Notes");
    expect(exportedPdf.getAuthor()).toBe("Ada Lovelace");
    expect(exportedPdf.getSubject()).toBe("Research");
    expect(exportedPdf.getKeywords()).toBe("math computing");
    expect(exportedPdf.getCreator()).toBe("Forms App");
    expect(exportedPdf.getProducer()).toBe("PDF Editor by kototok903");
    expect(
      exportedPdf.catalog.lookup(PDFName.of("Lang"), PDFString).decodeText(),
    ).toBe("en-US");
    expect(exportedPdf.getModificationDate()).toBeInstanceOf(Date);
  });

  it("keeps an edited PDF producer", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      imageAssets: [],
      metadata: {
        author: null,
        creator: null,
        customProperties: [],
        isProducerOverridden: true,
        keywords: null,
        language: null,
        producer: "Custom Producer",
        subject: null,
        title: null,
        trapped: null,
      },
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes, {
      updateMetadata: false,
    });

    expect(exportedPdf.getProducer()).toBe("Custom Producer");
  });

  it("writes trapped status and custom metadata properties", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      imageAssets: [],
      metadata: {
        author: null,
        creator: null,
        customProperties: [{ key: "Client", value: "Acme" }],
        isProducerOverridden: false,
        keywords: null,
        language: null,
        producer: null,
        subject: null,
        title: null,
        trapped: "Unknown",
      },
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes, {
      updateMetadata: false,
    });
    const infoRef = exportedPdf.context.trailerInfo.Info;

    if (!infoRef) {
      throw new Error("Expected exported PDF info dictionary.");
    }

    const info = exportedPdf.context.lookup(infoRef, PDFDict);

    expect(info.lookup(PDFName.of("Trapped"), PDFName).decodeText()).toBe(
      "Unknown",
    );
    expect(info.lookup(PDFName.of("Client"), PDFHexString).decodeText()).toBe(
      "Acme",
    );
  });

  it("applies filled form values without flattening by default", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      formEdits: {
        values: [
          { fieldName: "name", pageId: "page-1", type: "text", value: "Ada" },
          {
            checked: true,
            fieldName: "agree",
            pageId: "page-1",
            type: "checkbox",
          },
          {
            fieldName: "color",
            pageId: "page-1",
            selectedValue: "1",
            type: "radio",
          },
          {
            fieldName: "country",
            pageId: "page-1",
            type: "choice",
            values: ["jp"],
          },
        ],
      },
      formFontBytes: await readFormFontBytes(),
      imageAssets: [],
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes);
    const form = exportedPdf.getForm();

    expect(form.getTextField("name").getText()).toBe("Ada");
    expect(form.getCheckBox("agree").isChecked()).toBe(true);
    expect(form.getRadioGroup("color").getSelected()).toBe("blue");
    expect(form.getDropdown("country").getSelected()).toEqual(["jp"]);
  });

  it("supports non-latin form text with the embedded form font", async () => {
    const originalPdfBytes = await createFormPdf();
    const formEdits: EditorFormEdits = {
      values: [
        { fieldName: "name", pageId: "page-1", type: "text", value: "Привет" },
      ],
    };
    const exportedBytes = await exportPdf({
      flattenForms: false,
      formEdits,
      formFontBytes: await readFormFontBytes(),
      imageAssets: [],
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes);

    expect(exportedPdf.getForm().getTextField("name").getText()).toBe("Привет");
  });

  it("flattens form fields when requested", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      flattenForms: true,
      formEdits: {
        values: [
          { fieldName: "name", pageId: "page-1", type: "text", value: "Ada" },
        ],
      },
      formFontBytes: await readFormFontBytes(),
      imageAssets: [],
      originalPdfBytes,
      overlays: [],
    });
    const exportedPdf = await PDFDocument.load(exportedBytes);

    expect(exportedPdf.getForm().getFields()).toHaveLength(0);
  });
});

async function createFormPdf() {
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([400, 500]);
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const form = pdfDocument.getForm();
  const textField = form.createTextField("name");
  const checkbox = form.createCheckBox("agree");
  const radioGroup = form.createRadioGroup("color");
  const dropdown = form.createDropdown("country");

  textField.addToPage(page, {
    font,
    height: 24,
    width: 200,
    x: 50,
    y: 420,
  });
  checkbox.addToPage(page, {
    height: 20,
    width: 20,
    x: 50,
    y: 380,
  });
  radioGroup.addOptionToPage("red", page, {
    height: 18,
    width: 18,
    x: 50,
    y: 340,
  });
  radioGroup.addOptionToPage("blue", page, {
    height: 18,
    width: 18,
    x: 90,
    y: 340,
  });
  dropdown.addOptions(["de", "jp"]);
  dropdown.addToPage(page, {
    font,
    height: 24,
    width: 120,
    x: 50,
    y: 300,
  });

  return copyBytesToArrayBuffer(await pdfDocument.save());
}

async function readFormFontBytes() {
  const bytes = await readFile(
    "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf",
  );

  return copyBytesToArrayBuffer(bytes);
}

function copyBytesToArrayBuffer(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(arrayBuffer).set(bytes);

  return arrayBuffer;
}
