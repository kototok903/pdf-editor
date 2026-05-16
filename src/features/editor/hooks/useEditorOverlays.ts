import { useCallback, useEffect, useRef, useState } from "react";

import type {
  EditorOverlay,
  EditorOverlayInput,
  MarkOverlayPatch,
  PdfRect,
  TextOverlayPatch,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import {
  cloneHistoryEntry,
  commitEditorHistory,
  commitEditorHistoryFromBase,
  createEditorHistory,
  createHistoryEntry,
  redoEditorHistory,
  replaceEditorHistoryPresent,
  resetEditorHistory,
  restoreEditorHistory,
  undoEditorHistory,
  type EditorHistoryEntry,
  type EditorHistoryState,
} from "@/features/editor/lib/editor-history";
import { moveOverlayToPageLayer } from "@/features/editor/lib/layer-sidebar-utils";

function createOverlayId() {
  return crypto.randomUUID();
}

function useEditorOverlays() {
  const [history, setHistory] = useState<EditorHistoryState>(() =>
    createEditorHistory(),
  );
  const historyRef = useRef(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const overlays = history.present.overlays;
  const selectedOverlayId = history.present.selectedOverlayId;

  const commitOverlayState = useCallback(
    (
      update: (currentOverlays: EditorOverlay[]) => EditorOverlay[],
      selectedOverlayId: string | null,
    ) => {
      setHistory((currentHistory) => {
        const nextOverlays = update(currentHistory.present.overlays);

        return commitEditorHistory(
          currentHistory,
          createHistoryEntry(nextOverlays, selectedOverlayId),
        );
      });
    },
    [],
  );

  const replacePresent = useCallback(
    (nextOverlays: EditorOverlay[], nextSelectedOverlayId: string | null) => {
      setHistory((currentHistory) =>
        replaceEditorHistoryPresent(
          currentHistory,
          createHistoryEntry(nextOverlays, nextSelectedOverlayId),
        ),
      );
    },
    [],
  );

  const addOverlay = useCallback(
    (input: EditorOverlayInput) => {
      const overlay: EditorOverlay = {
        id: createOverlayId(),
        ...input,
      };

      commitOverlayState(
        (currentOverlays) => [...currentOverlays, overlay],
        overlay.id,
      );

      return overlay;
    },
    [commitOverlayState],
  );

  const clearSelection = useCallback(() => {
    replacePresent(historyRef.current.present.overlays, null);
  }, [replacePresent]);

  const clearOverlays = useCallback(() => {
    setHistory(resetEditorHistory());
  }, []);

  const replaceOverlays = useCallback(
    (
      nextOverlays: EditorOverlay[],
      nextSelectedOverlayId: string | null = null,
    ) => {
      replacePresent(nextOverlays, nextSelectedOverlayId);
    },
    [replacePresent],
  );

  const resetHistory = useCallback(
    (
      nextOverlays: EditorOverlay[] = [],
      nextSelectedOverlayId: string | null = null,
      nextHistory?: EditorHistoryState,
    ) => {
      if (nextHistory) {
        setHistory(restoreEditorHistory(nextHistory));
      } else {
        setHistory(resetEditorHistory(nextOverlays, nextSelectedOverlayId));
      }
    },
    [],
  );

  const removeOverlay = useCallback(
    (overlayId: string) => {
      const nextSelectedOverlayId =
        selectedOverlayId === overlayId ? null : selectedOverlayId;

      commitOverlayState(
        (currentOverlays) =>
          currentOverlays.filter((overlay) => overlay.id !== overlayId),
        nextSelectedOverlayId,
      );
    },
    [commitOverlayState, selectedOverlayId],
  );

  const moveOverlayLayer = useCallback(
    ({
      insertBelowOverlayId,
      overlayId,
      pageNumber,
      trackHistory = true,
    }: {
      insertBelowOverlayId?: string | null;
      overlayId: string;
      pageNumber: number;
      trackHistory?: boolean;
    }) => {
      const updateOverlays = (currentOverlays: EditorOverlay[]) =>
        moveOverlayToPageLayer(currentOverlays, {
          insertBelowOverlayId,
          overlayId,
          pageNumber,
        });

      if (!trackHistory) {
        replacePresent(
          updateOverlays(historyRef.current.present.overlays),
          overlayId,
        );
        return;
      }

      commitOverlayState(updateOverlays, overlayId);
    },
    [commitOverlayState, replacePresent],
  );

  const selectOverlay = useCallback(
    (overlayId: string) => {
      replacePresent(historyRef.current.present.overlays, overlayId);
    },
    [replacePresent],
  );

  const updateOverlayRect = useCallback(
    (overlayId: string, rect: PdfRect) => {
      commitOverlayState(
        (currentOverlays) =>
          currentOverlays.map((overlay) =>
            overlay.id === overlayId ? { ...overlay, rect } : overlay,
          ),
        selectedOverlayId,
      );
    },
    [commitOverlayState, selectedOverlayId],
  );

  const updateTextOverlay = useCallback(
    (overlayId: string, patch: TextOverlayPatch) => {
      commitOverlayState(
        (currentOverlays) =>
          currentOverlays.map((overlay) =>
            overlay.id === overlayId && overlay.type === "text"
              ? { ...overlay, ...patch }
              : overlay,
          ),
        selectedOverlayId,
      );
    },
    [commitOverlayState, selectedOverlayId],
  );

  const updateTextOverlayDraft = useCallback(
    (overlayId: string, patch: TextOverlayPatch) => {
      replacePresent(
        historyRef.current.present.overlays.map((overlay) =>
          overlay.id === overlayId && overlay.type === "text"
            ? { ...overlay, ...patch }
            : overlay,
        ),
        selectedOverlayId,
      );
    },
    [replacePresent, selectedOverlayId],
  );

  const updateMarkOverlay = useCallback(
    (overlayId: string, patch: MarkOverlayPatch) => {
      commitOverlayState(
        (currentOverlays) =>
          currentOverlays.map((overlay) =>
            overlay.id === overlayId && overlay.type === "mark"
              ? { ...overlay, ...patch }
              : overlay,
          ),
        selectedOverlayId,
      );
    },
    [commitOverlayState, selectedOverlayId],
  );

  const updateWhiteoutOverlay = useCallback(
    (overlayId: string, patch: WhiteoutOverlayPatch) => {
      commitOverlayState(
        (currentOverlays) =>
          currentOverlays.map((overlay) =>
            overlay.id === overlayId && overlay.type === "whiteout"
              ? { ...overlay, ...patch }
              : overlay,
          ),
        selectedOverlayId,
      );
    },
    [commitOverlayState, selectedOverlayId],
  );

  const undo = useCallback(() => {
    setHistory((currentHistory) => undoEditorHistory(currentHistory));
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => redoEditorHistory(currentHistory));
  }, []);

  const getHistoryEntrySnapshot = useCallback(
    () => cloneHistoryEntry(historyRef.current.present),
    [],
  );

  const commitHistoryFromBase = useCallback((baseEntry: EditorHistoryEntry) => {
    setHistory((currentHistory) =>
      commitEditorHistoryFromBase(
        currentHistory,
        baseEntry,
        currentHistory.present,
      ),
    );
  }, []);

  return {
    addOverlay,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    clearOverlays,
    clearSelection,
    commitHistoryFromBase,
    getHistoryEntrySnapshot,
    history,
    moveOverlayLayer,
    overlays,
    redo,
    removeOverlay,
    replaceOverlays,
    resetHistory,
    selectOverlay,
    selectedOverlayId,
    undo,
    updateMarkOverlay,
    updateOverlayRect,
    updateTextOverlay,
    updateTextOverlayDraft,
    updateWhiteoutOverlay,
  };
}

export { useEditorOverlays };
