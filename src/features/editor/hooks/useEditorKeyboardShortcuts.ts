import { useEffect } from "react";

import type { EditorOverlay, PdfRect } from "@/features/editor/editor-types";
import { nudgeOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";
import type { PageSize } from "@/features/pdf/components/PdfPageView";

type UseEditorKeyboardShortcutsOptions = {
  editingOverlayId: string | null;
  hasActiveTool: boolean;
  onClearActiveTool: () => void;
  onClearSelection: () => void;
  onCopySelectedOverlay: (event?: ClipboardEvent) => void;
  onDuplicateSelectedOverlay: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPasteEvent: (event: ClipboardEvent) => void;
  onPasteWithCurrentTextSettings: () => void;
  onRemoveOverlay: (overlayId: string) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  pageSizes: Record<number, PageSize>;
  scale: number;
  selectedOverlay: EditorOverlay | null;
};

function useEditorKeyboardShortcuts({
  editingOverlayId,
  hasActiveTool,
  onClearActiveTool,
  onClearSelection,
  onCopySelectedOverlay,
  onDuplicateSelectedOverlay,
  onEditOverlay,
  onPasteEvent,
  onPasteWithCurrentTextSettings,
  onRemoveOverlay,
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

      const direction = getArrowDirection(event.key);

      if (!direction) {
        return;
      }

      const pageSize = pageSizes[selectedOverlay.pageNumber];

      if (!pageSize) {
        return;
      }

      event.preventDefault();
      onUpdateOverlayRect(
        selectedOverlay.id,
        nudgeOverlayRect(
          selectedOverlay.rect,
          direction,
          {
            height: pageSize.height / scale,
            width: pageSize.width / scale,
          },
          scale,
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
    hasActiveTool,
    onClearActiveTool,
    onClearSelection,
    onCopySelectedOverlay,
    onDuplicateSelectedOverlay,
    onEditOverlay,
    onPasteEvent,
    onPasteWithCurrentTextSettings,
    onRemoveOverlay,
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
    event.key === "Escape" ||
    ((event.metaKey || event.ctrlKey) && event.key === "Enter")
  );
}

function isDuplicateEvent(event: KeyboardEvent) {
  return isCommandOrControlEvent(event, "d") && !event.shiftKey;
}

function isPasteWithCurrentTextSettingsEvent(event: KeyboardEvent) {
  return isCommandOrControlEvent(event, "v") && event.shiftKey;
}

function isCommandOrControlEvent(event: KeyboardEvent, key: string) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === key;
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

export { useEditorKeyboardShortcuts };
