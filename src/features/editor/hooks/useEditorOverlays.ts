import { useCallback, useState } from "react";

import type {
  EditorOverlay,
  OverlayType,
  PdfRect,
} from "@/features/editor/editor-types";

type AddOverlayInput = {
  pageNumber: number;
  rect: PdfRect;
  type: OverlayType;
};

function createOverlayId() {
  return crypto.randomUUID();
}

function useEditorOverlays() {
  const [overlays, setOverlays] = useState<EditorOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );

  const addOverlay = useCallback((input: AddOverlayInput) => {
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

  return {
    addOverlay,
    clearSelection,
    overlays,
    removeOverlay,
    selectOverlay,
    selectedOverlayId,
    updateOverlayRect,
  };
}

export { useEditorOverlays };
