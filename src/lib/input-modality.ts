export type InputModality = "keyboard" | "pointer";

const modifierOnlyKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

let lastInputModality: InputModality = "keyboard";
let isTrackingStarted = false;

export function ensureInputModalityTracking() {
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

export function getLastInputModality(): InputModality {
  return lastInputModality;
}

/**
 * Return focus only for keyboard-to-keyboard interactions
 */
export function shouldRestoreFocusOnMenuClose(
  openModality: InputModality,
  closeModality: InputModality,
): boolean {
  return openModality === "keyboard" && closeModality === "keyboard";
}
