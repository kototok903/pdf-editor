type PagePointerDownTarget = {
  button: number;
  currentTarget: EventTarget | null;
  target: EventTarget | null;
};

function shouldClearOverlaySelectionOnPagePointerDown({
  button,
  currentTarget,
  target,
}: PagePointerDownTarget) {
  if (button !== 0) {
    return false;
  }

  if (!(currentTarget instanceof Element) || !(target instanceof Element)) {
    return false;
  }

  if (!currentTarget.contains(target)) {
    return false;
  }

  return (
    !target.closest("[data-editor-overlay-id]") &&
    !target.closest("[data-editor-overlay-handle]")
  );
}

export { shouldClearOverlaySelectionOnPagePointerDown };
