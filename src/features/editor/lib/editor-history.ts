import type {
  DocumentPage,
  EditorFormEdits,
  EditorOverlay,
  ImageOverlay,
  SignatureOverlay,
} from "@/features/editor/editor-types";
import {
  areEditorFormEditsEqual,
  cloneEditorFormEdits,
  emptyEditorFormEdits,
  normalizeEditorFormEdits,
} from "@/features/editor/lib/editor-form-edits";

type EditorHistoryEntry = {
  documentPages: DocumentPage[];
  formEdits: EditorFormEdits;
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
};

type EditorHistoryState = {
  future: EditorHistoryEntry[];
  past: EditorHistoryEntry[];
  present: EditorHistoryEntry;
};

type RestorableEditorHistoryEntry = Partial<EditorHistoryEntry>;

type RestorableEditorHistoryState = {
  future?: RestorableEditorHistoryEntry[];
  past?: RestorableEditorHistoryEntry[];
  present?: RestorableEditorHistoryEntry;
};

const editorHistoryLimit = 100;

function createEditorHistory(
  overlays: EditorOverlay[] = [],
  selectedOverlayId: string | null = null,
  formEdits: EditorFormEdits = emptyEditorFormEdits,
  documentPages: DocumentPage[] = [],
): EditorHistoryState {
  return {
    future: [],
    past: [],
    present: createHistoryEntry(
      overlays,
      selectedOverlayId,
      formEdits,
      documentPages,
    ),
  };
}

function createHistoryEntry(
  overlays: EditorOverlay[],
  selectedOverlayId: string | null,
  formEdits: EditorFormEdits = emptyEditorFormEdits,
  documentPages: DocumentPage[] = [],
): EditorHistoryEntry {
  return {
    documentPages: cloneDocumentPages(documentPages),
    formEdits: normalizeEditorFormEdits(formEdits),
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
    nextEntry.formEdits,
    nextEntry.documentPages,
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
    baseEntry.formEdits,
    baseEntry.documentPages,
  );
  const sanitizedNextEntry = createHistoryEntry(
    nextEntry.overlays,
    nextEntry.selectedOverlayId,
    nextEntry.formEdits,
    nextEntry.documentPages,
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
    nextEntry.formEdits,
    nextEntry.documentPages,
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
  formEdits: EditorFormEdits = emptyEditorFormEdits,
  documentPages: DocumentPage[] = [],
): EditorHistoryState {
  return createEditorHistory(
    overlays,
    selectedOverlayId,
    formEdits,
    documentPages,
  );
}

function restoreEditorHistory(
  history: RestorableEditorHistoryState | null | undefined,
): EditorHistoryState {
  const future = Array.isArray(history?.future) ? history.future : [];
  const past = Array.isArray(history?.past) ? history.past : [];

  return {
    future: future.map(cloneRestoredHistoryEntry),
    past: past.map(cloneRestoredHistoryEntry).slice(-editorHistoryLimit),
    present: cloneRestoredHistoryEntry(history?.present),
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
  return createHistoryEntry(
    entry.overlays,
    entry.selectedOverlayId,
    entry.formEdits,
    entry.documentPages,
  );
}

function cloneRestoredHistoryEntry(
  entry: RestorableEditorHistoryEntry | null | undefined,
): EditorHistoryEntry {
  return createHistoryEntry(
    cloneOverlays(entry?.overlays ?? []),
    entry?.selectedOverlayId ?? null,
    cloneEditorFormEdits(entry?.formEdits),
    cloneDocumentPages(entry?.documentPages ?? []),
  );
}

function cloneDocumentPages(documentPages: readonly DocumentPage[]) {
  return documentPages.map((page) => ({ ...page }));
}

function cloneOverlays(overlays: EditorOverlay[]) {
  return overlays.map((overlay) => ({
    ...overlay,
    rect: { ...overlay.rect },
  }));
}

function areHistoryEntriesEqual(
  left: RestorableEditorHistoryEntry | null | undefined,
  right: RestorableEditorHistoryEntry | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    areDocumentPagesEqual(
      left.documentPages ?? [],
      right.documentPages ?? [],
    ) &&
    areOverlayListsEqual(left.overlays ?? [], right.overlays ?? []) &&
    areEditorFormEditsEqual(left.formEdits, right.formEdits)
  );
}

function areDocumentPagesEqual(
  left: readonly DocumentPage[],
  right: readonly DocumentPage[],
) {
  return (
    left.length === right.length &&
    left.every((page, index) => areDocumentPageEqual(page, right[index]))
  );
}

function areDocumentPageEqual(
  left: DocumentPage,
  right: DocumentPage | undefined,
) {
  if (!right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.rotationDegrees === right.rotationDegrees &&
    left.sourceId === right.sourceId &&
    left.sourcePageNumber === right.sourcePageNumber
  );
}

function areEditorHistoriesEqual(
  left: RestorableEditorHistoryState | null | undefined,
  right: RestorableEditorHistoryState | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  const leftPast = Array.isArray(left.past) ? left.past : [];
  const rightPast = Array.isArray(right.past) ? right.past : [];
  const leftFuture = Array.isArray(left.future) ? left.future : [];
  const rightFuture = Array.isArray(right.future) ? right.future : [];

  return (
    areHistoryEntryListsEqual(leftPast, rightPast) &&
    areHistoryEntriesEqual(left.present, right.present) &&
    areHistoryEntryListsEqual(leftFuture, rightFuture)
  );
}

function areHistoryEntryListsEqual(
  left: Partial<EditorHistoryEntry>[],
  right: Partial<EditorHistoryEntry>[],
) {
  return (
    left.length === right.length &&
    left.every((entry, index) => areHistoryEntriesEqual(entry, right[index]))
  );
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
      left.pageId === right.pageId &&
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
  areEditorHistoriesEqual,
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
