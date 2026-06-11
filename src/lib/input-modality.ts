type InputModality = "keyboard" | "pointer";

const modifierOnlyKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

let lastInputModality: InputModality = "keyboard";
let isTrackingStarted = false;

function ensureInputModalityTracking() {
  if (isTrackingStarted || typeof window === "undefined") {
    return;
  }

  isTrackingStarted = true;

  window.addEventListener(
    "keydown",
    (event) => {
      if (!modifierOnlyKeys.has(event.key)) {
        lastInputModality = "keyboard";
      }
    },
    { capture: true },
  );

  window.addEventListener(
    "pointerdown",
    () => {
      lastInputModality = "pointer";
    },
    { capture: true },
  );
}

function getLastInputModality(): InputModality {
  return lastInputModality;
}

/**
 * Return focus only for keyboard-to-keyboard interactions
 */
function shouldRestoreFocusOnMenuClose(
  openModality: InputModality,
  closeModality: InputModality,
): boolean {
  return openModality === "keyboard" && closeModality === "keyboard";
}

export {
  ensureInputModalityTracking,
  getLastInputModality,
  shouldRestoreFocusOnMenuClose,
};
export type { InputModality };
