import { useEffect } from "react";

import type {
  DocumentPage,
  EditorOverlay,
  PdfRect,
} from "@/features/editor/editor-types";
import { getVisiblePageNumberForPageId } from "@/features/editor/lib/document-pages";
import type { LayerMoveDirection } from "@/features/editor/lib/layer-sidebar-utils";
import { getOverlayRotationDegrees } from "@/features/editor/lib/overlay-capabilities";
import { nudgeOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";
import type { PageSize } from "@/features/pdf/pdf-types";
import { isPlatformModKey } from "@/lib/platform-utils";

type UseEditorKeyboardShortcutsOptions = {
  documentPages: DocumentPage[];
  editingOverlayId: string | null;
  hasActiveTool: boolean;
  onClearActiveTool: () => void;
  onClearSelection: () => void;
  onCopySelectedOverlay: (event?: ClipboardEvent) => void;
  onDuplicateSelectedOverlay: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onMoveSelectedOverlayLayer: (
    overlayId: string,
    direction: LayerMoveDirection,
  ) => void;
  onPasteEvent: (event: ClipboardEvent) => void;
  onPasteWithCurrentTextSettings: () => void;
  onRedo: () => void;
  onRemoveOverlay: (overlayId: string) => void;
  onUndo: () => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  pageSizes: Record<number, PageSize>;
  scale: number;
  selectedOverlay: EditorOverlay | null;
};

export function useEditorKeyboardShortcuts({
  documentPages,
  editingOverlayId,
  hasActiveTool,
  onClearActiveTool,
  onClearSelection,
  onCopySelectedOverlay,
  onDuplicateSelectedOverlay,
  onEditOverlay,
  onMoveSelectedOverlayLayer,
  onPasteEvent,
  onPasteWithCurrentTextSettings,
  onRedo,
  onRemoveOverlay,
  onUndo,
  onUpdateOverlayRect,
  pageSizes,
  scale,
  selectedOverlay,
}: UseEditorKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditingSelectedText =
        selectedOverlay?.type === "text" &&
        editingOverlayId === selectedOverlay.id;

      if (isEditingSelectedText && isTextEditExitEvent(event)) {
        event.preventDefault();
        onEditOverlay(null);
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (isUndoEvent(event)) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (isRedoEvent(event)) {
        event.preventDefault();
        onRedo();
        return;
      }

      if (isPasteWithCurrentTextSettingsEvent(event)) {
        event.preventDefault();
        onPasteWithCurrentTextSettings();
        return;
      }

      if (event.key === "Escape") {
        if (hasActiveTool) {
          event.preventDefault();
          onClearActiveTool();
          return;
        }

        if (selectedOverlay) {
          event.preventDefault();
          onClearSelection();
        }

        return;
      }

      if (!selectedOverlay) {
        return;
      }

      if (isDuplicateEvent(event)) {
        event.preventDefault();
        onDuplicateSelectedOverlay();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onRemoveOverlay(selectedOverlay.id);
        onEditOverlay(null);
        return;
      }

      if (selectedOverlay.type === "text" && event.key === "Enter") {
        event.preventDefault();
        onEditOverlay(selectedOverlay.id);
        return;
      }

      const layerMoveDirection = getLayerMoveDirection(event);

      if (layerMoveDirection) {
        event.preventDefault();
        onMoveSelectedOverlayLayer(selectedOverlay.id, layerMoveDirection);
        onEditOverlay(null);
        return;
      }

      const direction = getArrowDirection(event.key);

      if (!direction) {
        return;
      }

      const selectedOverlayPageNumber = getVisiblePageNumberForPageId(
        documentPages,
        selectedOverlay.pageId,
      );
      const pageSize =
        selectedOverlayPageNumber === null
          ? null
          : pageSizes[selectedOverlayPageNumber];

      if (!pageSize) {
        return;
      }

      event.preventDefault();
      onUpdateOverlayRect(
        selectedOverlay.id,
        nudgeOverlayRect(
          selectedOverlay.rect,
          direction,
          pageSize,
          scale,
          getOverlayRotationDegrees(selectedOverlay),
        ),
      );
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      onPasteEvent(event);
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (!selectedOverlay || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      onCopySelectedOverlay(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
    };
  }, [
    editingOverlayId,
    documentPages,
    hasActiveTool,
    onClearActiveTool,
    onClearSelection,
    onCopySelectedOverlay,
    onDuplicateSelectedOverlay,
    onEditOverlay,
    onMoveSelectedOverlayLayer,
    onPasteEvent,
    onPasteWithCurrentTextSettings,
    onRedo,
    onRemoveOverlay,
    onUndo,
    onUpdateOverlayRect,
    pageSizes,
    scale,
    selectedOverlay,
  ]);
}

function getArrowDirection(key: string) {
  switch (key) {
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    default:
      return null;
  }
}

function isTextEditExitEvent(event: KeyboardEvent) {
  return (
    event.key === "Escape" || (isPlatformModKey(event) && event.key === "Enter")
  );
}

function isDuplicateEvent(event: KeyboardEvent) {
  return isModEvent(event, "d") && !event.shiftKey;
}

function isPasteWithCurrentTextSettingsEvent(event: KeyboardEvent) {
  return isModEvent(event, "v") && event.shiftKey;
}

function getLayerMoveDirection(
  event: KeyboardEvent,
): LayerMoveDirection | null {
  if (!isPlatformModKey(event)) {
    return null;
  }

  if (event.key === "ArrowUp") {
    return event.shiftKey ? "front" : "forward";
  }

  if (event.key === "ArrowDown") {
    return event.shiftKey ? "back" : "backward";
  }

  return null;
}

function isUndoEvent(event: KeyboardEvent) {
  return isModEvent(event, "z") && !event.shiftKey;
}

function isRedoEvent(event: KeyboardEvent) {
  return (isModEvent(event, "z") && event.shiftKey) || isModEvent(event, "y");
}

function isModEvent(event: KeyboardEvent, key: string) {
  return isPlatformModKey(event) && event.key.toLowerCase() === key;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [role='textbox'], [role='spinbutton']",
    ),
  );
}
