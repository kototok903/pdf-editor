import { describe, expect, it } from "vitest";

import {
  emptyEditorFormEdits,
  updatePdfFormValue,
} from "@/features/editor/lib/editor-form-edits";

describe("editor form edits", () => {
  it("stores same-named fields separately by page id", () => {
    const firstPageEdit = updatePdfFormValue(emptyEditorFormEdits, {
      fieldName: "name",
      pageId: "page-1",
      type: "text",
      value: "Ada",
    });
    const bothPageEdits = updatePdfFormValue(firstPageEdit, {
      fieldName: "name",
      pageId: "page-2",
      type: "text",
      value: "Grace",
    });
    const changedSecondPage = updatePdfFormValue(bothPageEdits, {
      fieldName: "name",
      pageId: "page-2",
      type: "text",
      value: "Katherine",
    });

    expect(changedSecondPage.values).toEqual([
      {
        fieldName: "name",
        pageId: "page-1",
        type: "text",
        value: "Ada",
      },
      {
        fieldName: "name",
        pageId: "page-2",
        type: "text",
        value: "Katherine",
      },
    ]);
  });
});
