import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  areEditorHistoriesEqual,
  commitEditorHistory,
  createEditorHistory,
  createHistoryEntry,
  editorHistoryLimit,
  getHistoryImageAssetIds,
  redoEditorHistory,
  resetEditorHistory,
  restoreEditorHistory,
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
    rotationDegrees: 0,
    sha256Signature: "signature-1",
    type: "image",
    ...patch,
  };
}

function createSignatureOverlay(
  patch: Partial<Extract<EditorOverlay, { type: "signature" }>> = {},
): Extract<EditorOverlay, { type: "signature" }> {
  return {
    assetId: "signature-asset-1",
    id: "overlay-signature-1",
    pageNumber: 1,
    rect: { height: 42, width: 160, x: 34, y: 44 },
    rotationDegrees: 0,
    sha256Signature: "signature-sha-1",
    type: "signature",
    ...patch,
  };
}

describe("editor history", () => {
  it("compares histories by overlay content across undo and redo stacks", () => {
    const firstOverlay = createTextOverlay();
    const secondOverlay = createTextOverlay({ id: "text-2" });
    const initialHistory = createEditorHistory([firstOverlay], firstOverlay.id);
    const committedHistory = commitEditorHistory(
      initialHistory,
      createHistoryEntry([firstOverlay, secondOverlay], secondOverlay.id),
    );
    const sameContentHistory = commitEditorHistory(
      createEditorHistory([firstOverlay], null),
      createHistoryEntry([firstOverlay, secondOverlay], null),
    );

    expect(areEditorHistoriesEqual(committedHistory, sameContentHistory)).toBe(
      true,
    );
    expect(
      areEditorHistoriesEqual(
        committedHistory,
        undoEditorHistory(committedHistory),
      ),
    ).toBe(false);
  });

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

  it("commits form value changes without requiring overlay changes", () => {
    const history = createEditorHistory();
    const committedHistory = commitEditorHistory(
      history,
      createHistoryEntry([], null, {
        values: [
          {
            fieldName: "name",
            type: "text",
            value: "Ada",
          },
        ],
      }),
    );

    expect(committedHistory.past).toHaveLength(1);
    expect(committedHistory.present.formEdits.values).toEqual([
      {
        fieldName: "name",
        type: "text",
        value: "Ada",
      },
    ]);
  });

  it("compares histories by form edits", () => {
    const history = createEditorHistory(
      [],
      null,
      {
        values: [
          {
            checked: true,
            fieldName: "agree",
            type: "checkbox",
          },
        ],
      },
    );
    const changedHistory = createEditorHistory(
      [],
      null,
      {
        values: [
          {
            checked: false,
            fieldName: "agree",
            type: "checkbox",
          },
        ],
      },
    );

    expect(areEditorHistoriesEqual(history, changedHistory)).toBe(false);
  });

  it("treats legacy histories without form edits as empty form edits", () => {
    const legacyHistory = {
      future: [],
      past: [],
      present: {
        overlays: [],
        selectedOverlayId: null,
      },
    };

    expect(areEditorHistoriesEqual(legacyHistory, createEditorHistory())).toBe(
      true,
    );
  });

  it("restores legacy history entries with empty form edits", () => {
    const restoredHistory = restoreEditorHistory({
      future: [],
      past: [],
      present: {
        overlays: [],
        selectedOverlayId: null,
      },
    });

    expect(restoredHistory.present.formEdits.values).toEqual([]);
  });

  it("does not update history for selection-only changes", () => {
    const firstOverlay = createTextOverlay();
    const secondOverlay = createTextOverlay({
      id: "text-2",
      rect: { height: 40, width: 120, x: 50, y: 60 },
    });
    const history = createEditorHistory(
      [firstOverlay, secondOverlay],
      firstOverlay.id,
    );
    const nextHistory = commitEditorHistory(
      history,
      createHistoryEntry([firstOverlay, secondOverlay], secondOverlay.id),
    );

    expect(nextHistory).toBe(history);
    expect(nextHistory.past).toHaveLength(0);
  });

  it("preserves unchanged overlay references when committing changes", () => {
    const firstOverlay = createTextOverlay();
    const secondOverlay = createTextOverlay({
      id: "text-2",
      rect: { height: 40, width: 120, x: 50, y: 60 },
    });
    const updatedSecondOverlay = {
      ...secondOverlay,
      rect: { ...secondOverlay.rect, x: 75 },
    };
    const committedHistory = commitEditorHistory(
      createEditorHistory([firstOverlay, secondOverlay], secondOverlay.id),
      createHistoryEntry(
        [firstOverlay, updatedSecondOverlay],
        secondOverlay.id,
      ),
    );

    expect(committedHistory.present.overlays[0]).toBe(firstOverlay);
    expect(committedHistory.present.overlays[1]).toBe(updatedSecondOverlay);
  });

  it("preserves overlay object references in new history entries", () => {
    const overlay = createTextOverlay();
    const entry = createHistoryEntry([overlay], overlay.id);

    expect(entry.overlays[0]).toBe(overlay);
    expect(entry.overlays[0]?.rect).toBe(overlay.rect);
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
    const signature = createSignatureOverlay({
      assetId: "signature-asset-1",
    });
    const committedHistory = commitEditorHistory(
      createEditorHistory([firstImage, signature], firstImage.id),
      createHistoryEntry([secondImage], secondImage.id),
    );
    const undoneHistory = undoEditorHistory(committedHistory);

    expect([...getHistoryImageAssetIds(undoneHistory)].sort()).toEqual([
      "image-1",
      "image-2",
      "signature-asset-1",
    ]);
  });
});
