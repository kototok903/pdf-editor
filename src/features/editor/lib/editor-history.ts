import type {
  EditorOverlay,
  ImageOverlay,
  SignatureOverlay,
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
    overlays,
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
    past: [...history.past, history.present].slice(-editorHistoryLimit),
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
  const sanitizedEntry = createHistoryEntry(
    nextEntry.overlays,
    nextEntry.selectedOverlayId,
  );

  if (areHistoryEntriesEqual(history.present, sanitizedEntry)) {
    return history;
  }

  return {
    ...history,
    present: sanitizedEntry,
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
    future: history.future.map(cloneRestoredHistoryEntry),
    past: history.past
      .map(cloneRestoredHistoryEntry)
      .slice(-editorHistoryLimit),
    present: cloneRestoredHistoryEntry(history.present),
  };
}

function undoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const previousEntry = history.past.at(-1);

  if (!previousEntry) {
    return history;
  }

  return {
    future: [history.present, ...history.future],
    past: history.past.slice(0, -1),
    present: previousEntry,
  };
}

function redoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const nextEntry = history.future[0];

  if (!nextEntry) {
    return history;
  }

  return {
    future: history.future.slice(1),
    past: [...history.past, history.present].slice(-editorHistoryLimit),
    present: nextEntry,
  };
}

function getHistoryImageAssetIds(history: EditorHistoryState) {
  const assetIds = new Set<string>();

  for (const entry of [...history.past, history.present, ...history.future]) {
    for (const overlay of entry.overlays) {
      if (isImageBackedOverlay(overlay)) {
        assetIds.add(overlay.assetId);
      }
    }
  }

  return assetIds;
}

function cloneHistoryEntry(entry: EditorHistoryEntry): EditorHistoryEntry {
  return createHistoryEntry(entry.overlays, entry.selectedOverlayId);
}

function cloneRestoredHistoryEntry(
  entry: EditorHistoryEntry,
): EditorHistoryEntry {
  return createHistoryEntry(
    cloneOverlays(entry.overlays),
    entry.selectedOverlayId,
  );
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
  return areOverlayListsEqual(left.overlays, right.overlays);
}

function areOverlayListsEqual(left: EditorOverlay[], right: EditorOverlay[]) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((overlay, index) =>
    areOverlaysEqual(overlay, right[index]),
  );
}

function areOverlaysEqual(left: EditorOverlay, right: EditorOverlay) {
  return (
    left === right ||
    (left.type === right.type &&
      left.id === right.id &&
      left.pageNumber === right.pageNumber &&
      arePdfRectsEqual(left.rect, right.rect) &&
      areOverlayTypeFieldsEqual(left, right))
  );
}

function arePdfRectsEqual(
  left: EditorOverlay["rect"],
  right: EditorOverlay["rect"],
) {
  return (
    left === right ||
    (left.height === right.height &&
      left.width === right.width &&
      left.x === right.x &&
      left.y === right.y)
  );
}

function areOverlayTypeFieldsEqual(left: EditorOverlay, right: EditorOverlay) {
  switch (left.type) {
    case "image":
    case "signature":
      return (
        right.type === left.type &&
        left.assetId === right.assetId &&
        left.rotationDegrees === right.rotationDegrees &&
        left.sha256Signature === right.sha256Signature
      );
    case "mark":
      return (
        right.type === "mark" &&
        left.color === right.color &&
        left.markType === right.markType
      );
    case "text":
      return (
        right.type === "text" &&
        left.color === right.color &&
        left.fontId === right.fontId &&
        left.fontSize === right.fontSize &&
        left.text === right.text
      );
    case "whiteout":
      return right.type === "whiteout" && left.color === right.color;
  }
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

function isImageBackedOverlay(
  overlay: EditorOverlay,
): overlay is ImageOverlay | SignatureOverlay {
  return overlay.type === "image" || overlay.type === "signature";
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
