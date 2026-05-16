import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  commitEditorHistory,
  createEditorHistory,
  createHistoryEntry,
  editorHistoryLimit,
  getHistoryImageAssetIds,
  redoEditorHistory,
  resetEditorHistory,
  undoEditorHistory,
} from "@/features/editor/lib/editor-history";

function createTextOverlay(
  patch: Partial<Extract<EditorOverlay, { type: "text" }>> = {},
): Extract<EditorOverlay, { type: "text" }> {
  return {
    color: "#111111",
    fontId: "helvetica",
    fontSize: 16,
    id: "text-1",
    pageNumber: 1,
    rect: { height: 40, width: 120, x: 20, y: 30 },
    text: "Text",
    type: "text",
    ...patch,
  };
}

function createImageOverlay(
  patch: Partial<Extract<EditorOverlay, { type: "image" }>> = {},
): Extract<EditorOverlay, { type: "image" }> {
  return {
    assetId: "image-1",
    id: "overlay-image-1",
    pageNumber: 1,
    rect: { height: 40, width: 80, x: 30, y: 40 },
    sha256Signature: "signature-1",
    type: "image",
    ...patch,
  };
}

describe("editor history", () => {
  it("commits present changes, clears redo, and restores with undo and redo", () => {
    const firstOverlay = createTextOverlay();
    const secondOverlay = createTextOverlay({
      id: "text-2",
      rect: { height: 40, width: 120, x: 50, y: 60 },
    });
    const initialHistory = createEditorHistory([firstOverlay], firstOverlay.id);
    const committedHistory = commitEditorHistory(
      initialHistory,
      createHistoryEntry([firstOverlay, secondOverlay], secondOverlay.id),
    );
    const undoneHistory = undoEditorHistory(committedHistory);

    expect(committedHistory.past).toHaveLength(1);
    expect(committedHistory.future).toHaveLength(0);
    expect(undoneHistory.present.overlays).toEqual([firstOverlay]);
    expect(undoneHistory.future).toHaveLength(1);
    expect(redoEditorHistory(undoneHistory).present.overlays).toEqual([
      firstOverlay,
      secondOverlay,
    ]);
  });

  it("does not push no-op commits", () => {
    const overlay = createTextOverlay();
    const history = createEditorHistory([overlay], overlay.id);
    const nextHistory = commitEditorHistory(
      history,
      createHistoryEntry([overlay], overlay.id),
    );

    expect(nextHistory).toBe(history);
    expect(nextHistory.past).toHaveLength(0);
  });

  it("limits past entries to the configured stack size", () => {
    let history = createEditorHistory();

    for (let index = 0; index < editorHistoryLimit + 5; index += 1) {
      history = commitEditorHistory(
        history,
        createHistoryEntry(
          [
            createTextOverlay({
              id: `text-${index}`,
              text: `Text ${index}`,
            }),
          ],
          `text-${index}`,
        ),
      );
    }

    expect(history.past).toHaveLength(editorHistoryLimit);
    expect(history.past[0].overlays[0]?.id).toBe("text-4");
  });

  it("resets history with empty past and future stacks", () => {
    const overlay = createTextOverlay();
    const committedHistory = commitEditorHistory(
      createEditorHistory(),
      createHistoryEntry([overlay], overlay.id),
    );
    const resetHistory = resetEditorHistory([overlay], overlay.id);

    expect(committedHistory.past).toHaveLength(1);
    expect(resetHistory).toEqual({
      future: [],
      past: [],
      present: createHistoryEntry([overlay], overlay.id),
    });
  });

  it("collects image asset ids from past, present, and future", () => {
    const firstImage = createImageOverlay({ assetId: "image-1" });
    const secondImage = createImageOverlay({
      assetId: "image-2",
      id: "overlay-image-2",
    });
    const committedHistory = commitEditorHistory(
      createEditorHistory([firstImage], firstImage.id),
      createHistoryEntry([secondImage], secondImage.id),
    );
    const undoneHistory = undoEditorHistory(committedHistory);

    expect([...getHistoryImageAssetIds(undoneHistory)].sort()).toEqual([
      "image-1",
      "image-2",
    ]);
  });
});
