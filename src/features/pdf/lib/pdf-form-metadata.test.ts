// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  applyFormEditsToAnnotationStorage,
  createPdfFormFieldRegistry,
  extractPdfFormWidgets,
  syncFormControlsWithFormEdits,
} from "@/features/pdf/lib/pdf-form-metadata";

describe("pdf form metadata", () => {
  it("extracts supported form widgets from PDF.js annotations", () => {
    const widgets = extractPdfFormWidgets(
      [
        {
          fieldName: "name",
          fieldType: "Tx",
          fieldValue: "Ada",
          id: "10R",
          readOnly: false,
          rect: [10, 20, 110, 40],
        },
        {
          id: "not-a-widget",
          rect: [0, 0, 10, 10],
        },
      ],
      2,
      "page-2",
    );

    expect(widgets).toEqual([
      {
        combo: false,
        fieldName: "name",
        fieldType: "Tx",
        fieldValue: "Ada",
        id: "10R",
        multiSelect: false,
        options: undefined,
        pageNumber: 2,
        pageId: "page-2",
        readOnly: false,
        rect: [10, 20, 110, 40],
      },
    ]);
  });

  it("groups radio widgets and preserves button values", () => {
    const registry = createPdfFormFieldRegistry([
      {
        buttonValue: "red",
        fieldName: "color",
        fieldType: "Btn",
        fieldValue: null,
        id: "10R",
        pageNumber: 1,
        pageId: "page-1",
        readOnly: false,
        rect: [10, 20, 20, 30],
      },
      {
        buttonValue: "blue",
        fieldName: "color",
        fieldType: "Btn",
        fieldValue: null,
        id: "11R",
        pageNumber: 1,
        pageId: "page-1",
        readOnly: false,
        rect: [30, 20, 40, 30],
      },
    ]);

    expect(registry.fieldsByName.get("color")).toMatchObject({
      fieldName: "color",
      fieldType: "radio",
      options: ["red", "blue"],
      widgetIds: ["10R", "11R"],
    });
  });

  it("groups choice widgets with export values", () => {
    const registry = createPdfFormFieldRegistry([
      {
        combo: true,
        fieldName: "country",
        fieldType: "Ch",
        fieldValue: ["de"],
        id: "20R",
        multiSelect: false,
        options: [
          { displayValue: "Germany", exportValue: "de" },
          { displayValue: "Japan", exportValue: "jp" },
        ],
        pageNumber: 1,
        pageId: "page-1",
        readOnly: false,
        rect: [10, 20, 110, 40],
      },
    ]);

    expect(registry.fieldsByName.get("country")).toMatchObject({
      combo: true,
      fieldName: "country",
      fieldType: "choice",
      multiSelect: false,
      options: [
        { displayValue: "Germany", exportValue: "de" },
        { displayValue: "Japan", exportValue: "jp" },
      ],
    });
  });

  it("resets annotation storage to original widget values when fields have no edits", () => {
    const storedValues = new Map<string, object>();

    applyFormEditsToAnnotationStorage({
      annotationStorage: {
        setValue: (key, value) => storedValues.set(key, value),
      },
      formEdits: { values: [] },
      widgets: [
        {
          fieldName: "name",
          fieldType: "Tx",
          fieldValue: "Ada",
          id: "10R",
          pageNumber: 1,
          pageId: "page-1",
          readOnly: false,
          rect: [10, 20, 110, 40],
        },
        {
          exportValue: "yes",
          fieldName: "agree",
          fieldType: "Btn",
          fieldValue: "yes",
          id: "11R",
          pageNumber: 1,
          pageId: "page-1",
          readOnly: false,
          rect: [10, 50, 20, 60],
        },
      ],
    });

    expect(storedValues.get("10R")).toEqual({ value: "Ada" });
    expect(storedValues.get("11R")).toEqual({ value: true });
  });

  it("syncs form edits into existing controls without rebuilding them", () => {
    const container = document.createElement("div");
    const input = document.createElement("input");
    const checkbox = document.createElement("input");

    input.setAttribute("data-element-id", "10R");
    input.value = "Ada";
    checkbox.setAttribute("data-element-id", "11R");
    checkbox.type = "checkbox";
    container.append(input, checkbox);

    syncFormControlsWithFormEdits({
      container,
      formEdits: {
        values: [
          { fieldName: "name", pageId: "page-1", type: "text", value: "Grace" },
          {
            checked: true,
            fieldName: "agree",
            pageId: "page-1",
            type: "checkbox",
          },
        ],
      },
      widgets: [
        {
          fieldName: "name",
          fieldType: "Tx",
          fieldValue: "Ada",
          id: "10R",
          pageNumber: 1,
          pageId: "page-1",
          readOnly: false,
          rect: [10, 20, 110, 40],
        },
        {
          exportValue: "yes",
          fieldName: "agree",
          fieldType: "Btn",
          fieldValue: "Off",
          id: "11R",
          pageNumber: 1,
          pageId: "page-1",
          readOnly: false,
          rect: [10, 50, 20, 60],
        },
      ],
    });

    expect(input.value).toBe("Grace");
    expect(checkbox.checked).toBe(true);
  });
});
