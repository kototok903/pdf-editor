import { useCallback, useEffect, useRef, useState } from "react";

import type {
  EditorHistoryEntry,
  EditorHistoryState,
} from "@/features/editor/lib/editor-history";

type UseOverlayEditingSessionOptions = {
  commitHistoryFromBase: (baseEntry: EditorHistoryEntry) => void;
  getHistoryEntrySnapshot: () => EditorHistoryEntry;
};

function useOverlayEditingSession({
  commitHistoryFromBase,
  getHistoryEntrySnapshot,
}: UseOverlayEditingSessionOptions) {
  const editingOverlayIdRef = useRef<string | null>(null);
  const textEditHistoryEntryRef = useRef<EditorHistoryEntry | null>(null);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);

  useEffect(() => {
    editingOverlayIdRef.current = editingOverlayId;

    if (editingOverlayId && !textEditHistoryEntryRef.current) {
      textEditHistoryEntryRef.current = getHistoryEntrySnapshot();
    }
  }, [editingOverlayId, getHistoryEntrySnapshot]);

  const commitPendingTextEdit = useCallback(() => {
    const baseEntry = textEditHistoryEntryRef.current;

    if (!baseEntry) {
      return;
    }

    textEditHistoryEntryRef.current = null;
    commitHistoryFromBase(baseEntry);
  }, [commitHistoryFromBase]);

  const editOverlay = useCallback(
    (overlayId: string | null) => {
      const currentEditingOverlayId = editingOverlayIdRef.current;

      if (currentEditingOverlayId && currentEditingOverlayId !== overlayId) {
        commitPendingTextEdit();
      }

      editingOverlayIdRef.current = overlayId;
      setEditingOverlayId(overlayId);
    },
    [commitPendingTextEdit],
  );

  const clearEditing = useCallback(() => {
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);
  }, []);

  const resetEditingSession = useCallback(() => {
    textEditHistoryEntryRef.current = null;
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);
  }, []);

  const isEditingOverlayDifferentFrom = useCallback((overlayId: string) => {
    return Boolean(
      editingOverlayIdRef.current && editingOverlayIdRef.current !== overlayId,
    );
  }, []);

  return {
    clearEditing,
    commitPendingTextEdit,
    editingOverlayId,
    editOverlay,
    isEditingOverlayDifferentFrom,
    resetEditingSession,
  };
}

function isEmptyEditorHistory(history: EditorHistoryState) {
  return (
    history.future.length === 0 &&
    history.past.length === 0 &&
    history.present.overlays.length === 0 &&
    history.present.selectedOverlayId === null
  );
}

export { isEmptyEditorHistory, useOverlayEditingSession };
