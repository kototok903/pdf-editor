import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";

import type { EditorFormEdits } from "@/features/editor/editor-types";
import { exportPdf } from "@/features/pdf-export/lib/export-pdf";

describe("export pdf form fields", () => {
  it("applies filled form values without flattening by default", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      formEdits: {
        values: [
          { fieldName: "name", type: "text", value: "Ada" },
          { checked: true, fieldName: "agree", type: "checkbox" },
          { fieldName: "color", selectedValue: "1", type: "radio" },
          { fieldName: "country", type: "choice", values: ["jp"] },
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
      values: [{ fieldName: "name", type: "text", value: "Привет" }],
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

    expect(exportedPdf.getForm().getTextField("name").getText()).toBe(
      "Привет",
    );
  });

  it("flattens form fields when requested", async () => {
    const originalPdfBytes = await createFormPdf();
    const exportedBytes = await exportPdf({
      flattenForms: true,
      formEdits: {
        values: [{ fieldName: "name", type: "text", value: "Ada" }],
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
