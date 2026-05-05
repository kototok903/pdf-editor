import { useCallback, useState } from "react";

import type {
  EditorOverlay,
  EditorOverlayInput,
  MarkOverlayPatch,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";

function createOverlayId() {
  return crypto.randomUUID();
}

function useEditorOverlays() {
  const [overlays, setOverlays] = useState<EditorOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );

  const addOverlay = useCallback((input: EditorOverlayInput) => {
    const overlay: EditorOverlay = {
      id: createOverlayId(),
      ...input,
    };

    setOverlays((currentOverlays) => [...currentOverlays, overlay]);
    setSelectedOverlayId(overlay.id);

    return overlay;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedOverlayId(null);
  }, []);

  const clearOverlays = useCallback(() => {
    setOverlays([]);
    setSelectedOverlayId(null);
  }, []);

  const removeOverlay = useCallback((overlayId: string) => {
    setOverlays((currentOverlays) =>
      currentOverlays.filter((overlay) => overlay.id !== overlayId),
    );
    setSelectedOverlayId((currentSelectedId) =>
      currentSelectedId === overlayId ? null : currentSelectedId,
    );
  }, []);

  const selectOverlay = useCallback((overlayId: string) => {
    setSelectedOverlayId(overlayId);
  }, []);

  const updateOverlayRect = useCallback((overlayId: string, rect: PdfRect) => {
    setOverlays((currentOverlays) =>
      currentOverlays.map((overlay) =>
        overlay.id === overlayId ? { ...overlay, rect } : overlay,
      ),
    );
  }, []);

  const updateTextOverlay = useCallback(
    (overlayId: string, patch: TextOverlayPatch) => {
      setOverlays((currentOverlays) =>
        currentOverlays.map((overlay) =>
          overlay.id === overlayId && overlay.type === "text"
            ? { ...overlay, ...patch }
            : overlay,
        ),
      );
    },
    [],
  );

  const updateMarkOverlay = useCallback(
    (overlayId: string, patch: MarkOverlayPatch) => {
      setOverlays((currentOverlays) =>
        currentOverlays.map((overlay) =>
          overlay.id === overlayId && overlay.type === "mark"
            ? { ...overlay, ...patch }
            : overlay,
        ),
      );
    },
    [],
  );

  return {
    addOverlay,
    clearOverlays,
    clearSelection,
    overlays,
    removeOverlay,
    selectOverlay,
    selectedOverlayId,
    updateMarkOverlay,
    updateOverlayRect,
    updateTextOverlay,
  };
}

export { useEditorOverlays };
