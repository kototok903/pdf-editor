import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  createExternalPasteRecord,
  shouldSkipExternalPaste,
} from "@/features/editor/lib/external-paste-dedupe";

const overlay: EditorOverlay = {
  color: "#111827",
  fontId: "helvetica",
  fontSize: 16,
  id: "overlay-1",
  pageNumber: 1,
  rect: { height: 32, width: 140, x: 40, y: 50 },
  text: "Pasted",
  type: "text",
};

describe("external paste dedupe", () => {
  it("skips the same external paste while the pasted overlay is unmoved", () => {
    const record = createExternalPasteRecord(overlay, "text/plain:Pasted");

    expect(shouldSkipExternalPaste(record, record.signature, [overlay])).toBe(
      true,
    );
  });

  it("allows the same external paste after the previous overlay is moved or deleted", () => {
    const record = createExternalPasteRecord(overlay, "text/plain:Pasted");
    const movedOverlay = {
      ...overlay,
      rect: { ...overlay.rect, x: overlay.rect.x + 12 },
    };

    expect(
      shouldSkipExternalPaste(record, record.signature, [movedOverlay]),
    ).toBe(false);
    expect(shouldSkipExternalPaste(record, record.signature, [])).toBe(false);
  });
});
