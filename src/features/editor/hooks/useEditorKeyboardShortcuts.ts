import { useEffect } from "react";

import type { EditorOverlay, PdfRect } from "@/features/editor/editor-types";
import { nudgeOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";
import type { PageSize } from "@/features/pdf/components/PdfPageView";

type UseEditorKeyboardShortcutsOptions = {
  editingOverlayId: string | null;
  hasActiveTool: boolean;
  onClearActiveTool: () => void;
  onClearSelection: () => void;
  onCopySelectedOverlay: () => void;
  onDuplicateSelectedOverlay: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPaste: () => void;
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
  onPaste,
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

      if (isPasteEvent(event)) {
        event.preventDefault();
        onPaste();
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

      if (isCopyEvent(event)) {
        event.preventDefault();
        onCopySelectedOverlay();
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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    editingOverlayId,
    hasActiveTool,
    onClearActiveTool,
    onClearSelection,
    onCopySelectedOverlay,
    onDuplicateSelectedOverlay,
    onEditOverlay,
    onPaste,
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

function isCopyEvent(event: KeyboardEvent) {
  return isCommandOrControlEvent(event, "c") && !event.shiftKey;
}

function isDuplicateEvent(event: KeyboardEvent) {
  return isCommandOrControlEvent(event, "d") && !event.shiftKey;
}

function isPasteEvent(event: KeyboardEvent) {
  return isCommandOrControlEvent(event, "v") && !event.shiftKey;
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
