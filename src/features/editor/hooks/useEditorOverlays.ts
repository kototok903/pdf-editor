import { useCallback, useEffect, useRef, useState } from "react";

import type {
  EditorFormEdits,
  EditorOverlay,
  EditorOverlayInput,
  MarkOverlayPatch,
  PdfRect,
  PdfFormValue,
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
import {
  emptyEditorFormEdits,
  updatePdfFormValue,
} from "@/features/editor/lib/editor-form-edits";
import {
  moveOverlayLayerRelative,
  moveOverlayToPageLayer,
  type LayerMoveDirection,
} from "@/features/editor/lib/layer-sidebar-utils";
import { isRotatableOverlay } from "@/features/editor/lib/overlay-capabilities";
import { normalizeRotationDegrees } from "@/features/editor/lib/overlay-coordinate-utils";

function createOverlayId() {
  return crypto.randomUUID();
}

function useEditorOverlays() {
  const [history, setHistory] = useState<EditorHistoryState>(() =>
    createEditorHistory(),
  );
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );
  const historyRef = useRef(history);
  const selectedOverlayIdRef = useRef(selectedOverlayId);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    selectedOverlayIdRef.current = selectedOverlayId;
  }, [selectedOverlayId]);

  const overlays = history.present.overlays;
  const formEdits = history.present.formEdits;

  const commitOverlayState = useCallback(
    (
      update: (currentOverlays: EditorOverlay[]) => EditorOverlay[],
      nextSelectedOverlayId = selectedOverlayIdRef.current,
    ) => {
      setHistory((currentHistory) => {
        const nextOverlays = update(currentHistory.present.overlays);

        return commitEditorHistory(
          currentHistory,
          createHistoryEntry(
            nextOverlays,
            nextSelectedOverlayId,
            currentHistory.present.formEdits,
          ),
        );
      });
    },
    [],
  );

  const replacePresent = useCallback(
    (
      nextOverlays: EditorOverlay[],
      nextSelectedOverlayId = selectedOverlayIdRef.current,
      nextFormEdits = historyRef.current.present.formEdits,
    ) => {
      setHistory((currentHistory) =>
        replaceEditorHistoryPresent(
          currentHistory,
          createHistoryEntry(
            nextOverlays,
            nextSelectedOverlayId,
            nextFormEdits,
          ),
        ),
      );
    },
    [],
  );

  const setValidSelectedOverlayId = useCallback(
    (nextSelectedOverlayId: string | null, nextOverlays?: EditorOverlay[]) => {
      const overlaysToValidate =
        nextOverlays ?? historyRef.current.present.overlays;
      const validSelectedOverlayId = getValidSelectedOverlayId(
        overlaysToValidate,
        nextSelectedOverlayId,
      );

      setSelectedOverlayId((currentSelectedOverlayId) =>
        currentSelectedOverlayId === validSelectedOverlayId
          ? currentSelectedOverlayId
          : validSelectedOverlayId,
      );
    },
    [],
  );

  const addOverlay = useCallback(
    (input: EditorOverlayInput) => {
      const overlay = createOverlayFromInput(input);

      commitOverlayState(
        (currentOverlays) => [...currentOverlays, overlay],
        overlay.id,
      );
      setValidSelectedOverlayId(overlay.id, [
        ...historyRef.current.present.overlays,
        overlay,
      ]);

      return overlay;
    },
    [commitOverlayState, setValidSelectedOverlayId],
  );

  const clearSelection = useCallback(() => {
    setValidSelectedOverlayId(null);
  }, [setValidSelectedOverlayId]);

  const clearOverlays = useCallback(() => {
    setHistory(resetEditorHistory());
    setValidSelectedOverlayId(null, []);
  }, [setValidSelectedOverlayId]);

  const replaceOverlays = useCallback(
    (
      nextOverlays: EditorOverlay[],
      nextSelectedOverlayId: string | null = null,
    ) => {
      replacePresent(nextOverlays, nextSelectedOverlayId);
      setValidSelectedOverlayId(nextSelectedOverlayId, nextOverlays);
    },
    [replacePresent, setValidSelectedOverlayId],
  );

  const resetHistory = useCallback(
    (
      nextOverlays: EditorOverlay[] = [],
      nextSelectedOverlayId: string | null = null,
      nextHistory?: EditorHistoryState,
    ) => {
      if (nextHistory) {
        setHistory(restoreEditorHistory(nextHistory));
        setValidSelectedOverlayId(
          nextHistory.present.selectedOverlayId ?? nextSelectedOverlayId,
          nextHistory.present.overlays,
        );
      } else {
        setHistory(
          resetEditorHistory(
            nextOverlays,
            nextSelectedOverlayId,
            emptyEditorFormEdits,
          ),
        );
        setValidSelectedOverlayId(nextSelectedOverlayId, nextOverlays);
      }
    },
    [setValidSelectedOverlayId],
  );

  const removeOverlay = useCallback(
    (overlayId: string) => {
      const nextSelectedOverlayId =
        selectedOverlayIdRef.current === overlayId
          ? null
          : selectedOverlayIdRef.current;

      commitOverlayState(
        (currentOverlays) =>
          currentOverlays.filter((overlay) => overlay.id !== overlayId),
        nextSelectedOverlayId,
      );
      setSelectedOverlayId((currentSelectedOverlayId) =>
        currentSelectedOverlayId === overlayId
          ? null
          : currentSelectedOverlayId,
      );
    },
    [commitOverlayState],
  );

  const moveOverlayLayer = useCallback(
    ({
      insertBelowOverlayId,
      overlayId,
      pageNumber,
      targetPageSize,
      trackHistory = true,
    }: {
      insertBelowOverlayId?: string | null;
      overlayId: string;
      pageNumber: number;
      targetPageSize?: { height: number; width: number } | null;
      trackHistory?: boolean;
    }) => {
      const updateOverlays = (currentOverlays: EditorOverlay[]) =>
        moveOverlayToPageLayer(currentOverlays, {
          insertBelowOverlayId,
          overlayId,
          pageNumber,
          targetPageSize,
        });

      if (!trackHistory) {
        const nextOverlays = updateOverlays(
          historyRef.current.present.overlays,
        );
        replacePresent(nextOverlays, overlayId);
        setValidSelectedOverlayId(overlayId, nextOverlays);
        return;
      }

      commitOverlayState(updateOverlays, overlayId);
      setValidSelectedOverlayId(overlayId);
    },
    [commitOverlayState, replacePresent, setValidSelectedOverlayId],
  );

  const moveOverlayLayerInPage = useCallback(
    (overlayId: string, direction: LayerMoveDirection) => {
      commitOverlayState(
        (currentOverlays) =>
          moveOverlayLayerRelative(currentOverlays, overlayId, direction),
        overlayId,
      );
      setValidSelectedOverlayId(overlayId);
    },
    [commitOverlayState, setValidSelectedOverlayId],
  );

  const selectOverlay = useCallback(
    (overlayId: string) => {
      setValidSelectedOverlayId(overlayId);
    },
    [setValidSelectedOverlayId],
  );

  const updateOverlayRect = useCallback(
    (overlayId: string, rect: PdfRect) => {
      commitOverlayState((currentOverlays) =>
        updateOverlayById(currentOverlays, overlayId, (overlay) =>
          arePdfRectsEqual(overlay.rect, rect) ? overlay : { ...overlay, rect },
        ),
      );
    },
    [commitOverlayState],
  );

  const updateOverlayRotation = useCallback(
    (overlayId: string, rotationDegrees: number) => {
      commitOverlayState((currentOverlays) =>
        updateOverlayById(currentOverlays, overlayId, (overlay) =>
          isRotatableOverlay(overlay) &&
          overlay.rotationDegrees !== rotationDegrees
            ? { ...overlay, rotationDegrees }
            : overlay,
        ),
      );
    },
    [commitOverlayState],
  );

  const updateTextOverlay = useCallback(
    (overlayId: string, patch: TextOverlayPatch) => {
      commitOverlayState((currentOverlays) =>
        updateOverlayById(currentOverlays, overlayId, (overlay) =>
          overlay.type === "text" && !isOverlayPatchNoop(overlay, patch)
            ? { ...overlay, ...patch }
            : overlay,
        ),
      );
    },
    [commitOverlayState],
  );

  const updateTextOverlayDraft = useCallback(
    (overlayId: string, patch: TextOverlayPatch) => {
      replacePresent(
        updateOverlayById(
          historyRef.current.present.overlays,
          overlayId,
          (overlay) =>
            overlay.type === "text" && !isOverlayPatchNoop(overlay, patch)
              ? { ...overlay, ...patch }
              : overlay,
        ),
      );
    },
    [replacePresent],
  );

  const updateMarkOverlay = useCallback(
    (overlayId: string, patch: MarkOverlayPatch) => {
      commitOverlayState((currentOverlays) =>
        updateOverlayById(currentOverlays, overlayId, (overlay) =>
          overlay.type === "mark" && !isOverlayPatchNoop(overlay, patch)
            ? { ...overlay, ...patch }
            : overlay,
        ),
      );
    },
    [commitOverlayState],
  );

  const updateWhiteoutOverlay = useCallback(
    (overlayId: string, patch: WhiteoutOverlayPatch) => {
      commitOverlayState((currentOverlays) =>
        updateOverlayById(currentOverlays, overlayId, (overlay) =>
          overlay.type === "whiteout" && !isOverlayPatchNoop(overlay, patch)
            ? { ...overlay, ...patch }
            : overlay,
        ),
      );
    },
    [commitOverlayState],
  );

  const updateFormValue = useCallback((value: PdfFormValue) => {
    setHistory((currentHistory) => {
      const nextFormEdits = updatePdfFormValue(
        currentHistory.present.formEdits,
        value,
      );

      return commitEditorHistory(
        currentHistory,
        createHistoryEntry(
          currentHistory.present.overlays,
          currentHistory.present.selectedOverlayId,
          nextFormEdits,
        ),
      );
    });
  }, []);

  const replaceFormEdits = useCallback((nextFormEdits: EditorFormEdits) => {
    setHistory((currentHistory) =>
      replaceEditorHistoryPresent(
        currentHistory,
        createHistoryEntry(
          currentHistory.present.overlays,
          currentHistory.present.selectedOverlayId,
          nextFormEdits,
        ),
      ),
    );
  }, []);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const nextHistory = undoEditorHistory(currentHistory);
      setValidSelectedOverlayId(
        nextHistory.present.selectedOverlayId,
        nextHistory.present.overlays,
      );
      return nextHistory;
    });
  }, [setValidSelectedOverlayId]);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const nextHistory = redoEditorHistory(currentHistory);
      setValidSelectedOverlayId(
        nextHistory.present.selectedOverlayId,
        nextHistory.present.overlays,
      );
      return nextHistory;
    });
  }, [setValidSelectedOverlayId]);

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
    formEdits,
    history,
    moveOverlayLayer,
    moveOverlayLayerInPage,
    overlays,
    redo,
    removeOverlay,
    replaceFormEdits,
    replaceOverlays,
    resetHistory,
    selectOverlay,
    selectedOverlayId,
    undo,
    updateMarkOverlay,
    updateOverlayRect,
    updateOverlayRotation,
    updateTextOverlay,
    updateTextOverlayDraft,
    updateFormValue,
    updateWhiteoutOverlay,
  };
}

function createOverlayFromInput(input: EditorOverlayInput): EditorOverlay {
  const id = createOverlayId();

  switch (input.type) {
    case "image":
    case "signature":
      return {
        ...input,
        id,
        rotationDegrees: normalizeRotationDegrees(input.rotationDegrees ?? 0),
      };
    case "mark":
    case "text":
    case "whiteout":
      return { ...input, id };
  }
}

function updateOverlayById(
  overlays: EditorOverlay[],
  overlayId: string,
  update: (overlay: EditorOverlay) => EditorOverlay,
) {
  let didChange = false;
  const nextOverlays = overlays.map((overlay) => {
    if (overlay.id !== overlayId) {
      return overlay;
    }

    const nextOverlay = update(overlay);
    didChange ||= nextOverlay !== overlay;
    return nextOverlay;
  });

  return didChange ? nextOverlays : overlays;
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

function isOverlayPatchNoop(
  overlay: EditorOverlay,
  patch: MarkOverlayPatch | TextOverlayPatch | WhiteoutOverlayPatch,
) {
  return Object.entries(patch).every(
    ([key, value]) => overlay[key as keyof EditorOverlay] === value,
  );
}

function arePdfRectsEqual(left: PdfRect, right: PdfRect) {
  return (
    left === right ||
    (left.height === right.height &&
      left.width === right.width &&
      left.x === right.x &&
      left.y === right.y)
  );
}

export { useEditorOverlays };
