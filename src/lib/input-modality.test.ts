/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import {
  ensureInputModalityTracking,
  getLastInputModality,
  shouldRestoreFocusOnMenuClose,
} from "@/lib/input-modality";

describe("shouldRestoreFocusOnMenuClose", () => {
  it("restores focus only when the menu was opened and closed with the keyboard", () => {
    expect(shouldRestoreFocusOnMenuClose("keyboard", "keyboard")).toBe(true);
    expect(shouldRestoreFocusOnMenuClose("keyboard", "pointer")).toBe(false);
    expect(shouldRestoreFocusOnMenuClose("pointer", "keyboard")).toBe(false);
    expect(shouldRestoreFocusOnMenuClose("pointer", "pointer")).toBe(false);
  });
});

describe("input modality tracking", () => {
  it("reports keyboard modality after a non-modifier keydown", () => {
    ensureInputModalityTracking();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(getLastInputModality()).toBe("keyboard");
  });

  it("reports pointer modality after a pointerdown", () => {
    ensureInputModalityTracking();

    window.dispatchEvent(new Event("pointerdown"));

    expect(getLastInputModality()).toBe("pointer");
  });

  it("ignores modifier-only keydowns", () => {
    ensureInputModalityTracking();

    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Meta" }));

    expect(getLastInputModality()).toBe("pointer");
  });

  it("keeps tracking after repeated initialization", () => {
    ensureInputModalityTracking();
    ensureInputModalityTracking();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));

    expect(getLastInputModality()).toBe("keyboard");
  });
});
