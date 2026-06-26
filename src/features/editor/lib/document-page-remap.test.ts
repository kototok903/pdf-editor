import { describe, expect, it } from "vitest";

import type {
  EditorFormEdits,
  EditorOverlay,
} from "@/features/editor/editor-types";
import {
  dropFormValuesForMissingPageIds,
  dropOverlaysForMissingPageIds,
  duplicateFormValuesForPageIds,
  duplicateOverlaysForPageIds,
} from "@/features/editor/lib/document-page-remap";

describe("document page remap helpers", () => {
  it("duplicates overlays onto duplicated page ids", () => {
    const overlays = createOverlays();
    const duplicatedOverlays = duplicateOverlaysForPageIds(
      overlays,
      new Map([["page-1", "page-3"]]),
      (overlay) => `${overlay.id}-copy`,
    );

    expect(duplicatedOverlays).toEqual([
      {
        color: "#111827",
        fontId: "helvetica",
        fontSize: 18,
        id: "text-1-copy",
        pageId: "page-3",
        rect: { height: 40, width: 120, x: 10, y: 20 },
        text: "Hello",
        type: "text",
      },
    ]);
    expect(duplicatedOverlays[0]?.rect).not.toBe(overlays[0]?.rect);
  });

  it("duplicates form values onto duplicated page ids", () => {
    const formEdits = createFormEdits();
    const duplicatedFormEdits = duplicateFormValuesForPageIds(
      formEdits,
      new Map([["page-1", "page-3"]]),
    );

    expect(duplicatedFormEdits).toEqual({
      values: [
        {
          fieldName: "name",
          pageId: "page-3",
          type: "text",
          value: "Ada",
        },
        {
          fieldName: "options",
          pageId: "page-3",
          type: "choice",
          values: ["A", "B"],
        },
      ],
    });
    expect(duplicatedFormEdits.values[1]).toMatchObject({ type: "choice" });
    expect(
      duplicatedFormEdits.values[1]?.type === "choice"
        ? duplicatedFormEdits.values[1].values
        : [],
    ).not.toBe(
      formEdits.values[1]?.type === "choice" ? formEdits.values[1].values : [],
    );
  });

  it("drops overlays and form values for deleted pages", () => {
    expect(
      dropOverlaysForMissingPageIds(createOverlays(), ["page-1"]).map(
        (overlay) => overlay.id,
      ),
    ).toEqual(["text-1"]);
    expect(
      dropFormValuesForMissingPageIds(createFormEdits(), ["page-2"]),
    ).toEqual({
      values: [
        {
          checked: true,
          fieldName: "agree",
          pageId: "page-2",
          type: "checkbox",
        },
      ],
    });
  });
});

function createOverlays(): EditorOverlay[] {
  return [
    {
      color: "#111827",
      fontId: "helvetica",
      fontSize: 18,
      id: "text-1",
      pageId: "page-1",
      rect: { height: 40, width: 120, x: 10, y: 20 },
      text: "Hello",
      type: "text",
    },
    {
      color: "#ffffff",
      id: "whiteout-1",
      pageId: "page-2",
      rect: { height: 20, width: 80, x: 30, y: 40 },
      type: "whiteout",
    },
  ];
}

function createFormEdits(): EditorFormEdits {
  return {
    values: [
      {
        fieldName: "name",
        pageId: "page-1",
        type: "text",
        value: "Ada",
      },
      {
        fieldName: "options",
        pageId: "page-1",
        type: "choice",
        values: ["A", "B"],
      },
      {
        checked: true,
        fieldName: "agree",
        pageId: "page-2",
        type: "checkbox",
      },
    ],
  };
}
