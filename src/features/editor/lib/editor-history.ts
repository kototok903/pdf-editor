import type {
  EditorOverlay,
  ImageOverlay,
} from "@/features/editor/editor-types";

type EditorHistoryEntry = {
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
};

type EditorHistoryState = {
  future: EditorHistoryEntry[];
  past: EditorHistoryEntry[];
  present: EditorHistoryEntry;
};

const editorHistoryLimit = 100;

function createEditorHistory(
  overlays: EditorOverlay[] = [],
  selectedOverlayId: string | null = null,
): EditorHistoryState {
  return {
    future: [],
    past: [],
    present: createHistoryEntry(overlays, selectedOverlayId),
  };
}

function createHistoryEntry(
  overlays: EditorOverlay[],
  selectedOverlayId: string | null,
): EditorHistoryEntry {
  return {
    overlays: cloneOverlays(overlays),
    selectedOverlayId: getValidSelectedOverlayId(overlays, selectedOverlayId),
  };
}

function commitEditorHistory(
  history: EditorHistoryState,
  nextEntry: EditorHistoryEntry,
): EditorHistoryState {
  const sanitizedEntry = createHistoryEntry(
    nextEntry.overlays,
    nextEntry.selectedOverlayId,
  );

  if (areHistoryEntriesEqual(history.present, sanitizedEntry)) {
    return history;
  }

  return {
    future: [],
    past: [...history.past, cloneHistoryEntry(history.present)].slice(
      -editorHistoryLimit,
    ),
    present: sanitizedEntry,
  };
}

function commitEditorHistoryFromBase(
  history: EditorHistoryState,
  baseEntry: EditorHistoryEntry,
  nextEntry: EditorHistoryEntry,
): EditorHistoryState {
  const sanitizedBaseEntry = createHistoryEntry(
    baseEntry.overlays,
    baseEntry.selectedOverlayId,
  );
  const sanitizedNextEntry = createHistoryEntry(
    nextEntry.overlays,
    nextEntry.selectedOverlayId,
  );

  if (areHistoryEntriesEqual(sanitizedBaseEntry, sanitizedNextEntry)) {
    return replaceEditorHistoryPresent(history, sanitizedNextEntry);
  }

  return {
    future: [],
    past: [...history.past, sanitizedBaseEntry].slice(-editorHistoryLimit),
    present: sanitizedNextEntry,
  };
}

function replaceEditorHistoryPresent(
  history: EditorHistoryState,
  nextEntry: EditorHistoryEntry,
): EditorHistoryState {
  return {
    ...history,
    present: createHistoryEntry(
      nextEntry.overlays,
      nextEntry.selectedOverlayId,
    ),
  };
}

function resetEditorHistory(
  overlays: EditorOverlay[] = [],
  selectedOverlayId: string | null = null,
): EditorHistoryState {
  return createEditorHistory(overlays, selectedOverlayId);
}

function restoreEditorHistory(
  history: Pick<EditorHistoryState, "future" | "past" | "present">,
): EditorHistoryState {
  return {
    future: history.future.map(cloneHistoryEntry),
    past: history.past.map(cloneHistoryEntry).slice(-editorHistoryLimit),
    present: cloneHistoryEntry(history.present),
  };
}

function undoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const previousEntry = history.past.at(-1);

  if (!previousEntry) {
    return history;
  }

  return {
    future: [cloneHistoryEntry(history.present), ...history.future],
    past: history.past.slice(0, -1),
    present: cloneHistoryEntry(previousEntry),
  };
}

function redoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const nextEntry = history.future[0];

  if (!nextEntry) {
    return history;
  }

  return {
    future: history.future.slice(1),
    past: [...history.past, cloneHistoryEntry(history.present)].slice(
      -editorHistoryLimit,
    ),
    present: cloneHistoryEntry(nextEntry),
  };
}

function getHistoryImageAssetIds(history: EditorHistoryState) {
  const assetIds = new Set<string>();

  for (const entry of [...history.past, history.present, ...history.future]) {
    for (const overlay of entry.overlays) {
      if (isImageOverlay(overlay)) {
        assetIds.add(overlay.assetId);
      }
    }
  }

  return assetIds;
}

function cloneHistoryEntry(entry: EditorHistoryEntry): EditorHistoryEntry {
  return createHistoryEntry(entry.overlays, entry.selectedOverlayId);
}

function cloneOverlays(overlays: EditorOverlay[]) {
  return overlays.map((overlay) => ({
    ...overlay,
    rect: { ...overlay.rect },
  }));
}

function areHistoryEntriesEqual(
  left: EditorHistoryEntry,
  right: EditorHistoryEntry,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getValidSelectedOverlayId(
  overlays: EditorOverlay[],
  selectedOverlayId: string | null,
) {
  if (!selectedOverlayId) {
    return null;
  }

  return overlays.some((overlay) => overlay.id === selectedOverlayId)
    ? selectedOverlayId
    : null;
}

function isImageOverlay(overlay: EditorOverlay): overlay is ImageOverlay {
  return overlay.type === "image";
}

export {
  areHistoryEntriesEqual,
  cloneHistoryEntry,
  commitEditorHistory,
  commitEditorHistoryFromBase,
  createEditorHistory,
  createHistoryEntry,
  editorHistoryLimit,
  getHistoryImageAssetIds,
  redoEditorHistory,
  replaceEditorHistoryPresent,
  resetEditorHistory,
  restoreEditorHistory,
  undoEditorHistory,
};
export type { EditorHistoryEntry, EditorHistoryState };
