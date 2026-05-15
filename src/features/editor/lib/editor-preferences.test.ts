import { describe, expect, it, vi } from "vitest";

import {
  defaultEditorPreferences,
  editorPreferencesStorageKey,
  readEditorPreferences,
  writeEditorPreferences,
} from "@/features/editor/lib/editor-preferences";

function createMemoryStorage(initialValue?: string): Storage {
  const values = new Map<string, string>();

  if (initialValue !== undefined) {
    values.set(editorPreferencesStorageKey, initialValue);
  }

  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe("editor preferences persistence", () => {
  it("returns defaults when storage is empty", () => {
    expect(readEditorPreferences(createMemoryStorage())).toEqual(
      defaultEditorPreferences,
    );
  });

  it("returns defaults when storage is unavailable", () => {
    expect(readEditorPreferences(undefined)).toEqual(defaultEditorPreferences);
  });

  it("reads a valid stored preference object", () => {
    const storage = createMemoryStorage(
      JSON.stringify({
        isLayersSidebarOpen: true,
        isPagesSidebarOpen: false,
        markDefaults: { color: "#ff0000", markType: "x" },
        textDefaults: {
          color: "#00ff00",
          fontId: "courier",
          fontSize: 22,
          text: "Text",
        },
        themeName: "dark",
        version: 1,
        whiteoutDefaults: { color: "#eeeeee" },
        zoom: 1.4,
      }),
    );

    expect(readEditorPreferences(storage)).toEqual({
      isLayersSidebarOpen: true,
      isPagesSidebarOpen: false,
      markDefaults: { color: "#ff0000", markType: "x" },
      textDefaults: {
        color: "#00ff00",
        fontId: "courier",
        fontSize: 22,
        text: "Text",
      },
      themeName: "dark",
      whiteoutDefaults: { color: "#eeeeee" },
      zoom: 1.4,
    });
  });

  it("defaults the layers sidebar to closed for older stored preferences", () => {
    const storage = createMemoryStorage(
      JSON.stringify({
        isPagesSidebarOpen: true,
        themeName: "dark",
        version: 1,
      }),
    );

    expect(readEditorPreferences(storage).isLayersSidebarOpen).toBe(false);
  });

  it("falls back to defaults for malformed JSON", () => {
    expect(readEditorPreferences(createMemoryStorage("{"))).toEqual(
      defaultEditorPreferences,
    );
  });

  it("merges partial stored preferences with defaults", () => {
    const storage = createMemoryStorage(
      JSON.stringify({
        textDefaults: { fontSize: 30 },
        themeName: "dark",
        version: 1,
      }),
    );

    expect(readEditorPreferences(storage)).toEqual({
      ...defaultEditorPreferences,
      textDefaults: {
        ...defaultEditorPreferences.textDefaults,
        fontSize: 30,
      },
      themeName: "dark",
    });
  });

  it("clamps stored zoom into the supported editor range", () => {
    const storage = createMemoryStorage(
      JSON.stringify({ version: 1, zoom: 20 }),
    );

    expect(readEditorPreferences(storage).zoom).toBe(2);
  });

  it("falls back to the default whiteout color for invalid stored colors", () => {
    const storage = createMemoryStorage(
      JSON.stringify({
        version: 1,
        whiteoutDefaults: { color: "white" },
      }),
    );

    expect(readEditorPreferences(storage).whiteoutDefaults.color).toBe(
      "#ffffff",
    );
  });

  it("falls back to the default theme for unsupported theme names", () => {
    const storage = createMemoryStorage(
      JSON.stringify({ themeName: "solarized", version: 1 }),
    );

    expect(readEditorPreferences(storage).themeName).toBe("light");
  });

  it("writes preferences as schema version 1", () => {
    const storage = createMemoryStorage();

    writeEditorPreferences(
      {
        ...defaultEditorPreferences,
        themeName: "dark",
      },
      storage,
    );

    expect(storage.setItem).toHaveBeenCalledWith(
      editorPreferencesStorageKey,
      JSON.stringify({
        ...defaultEditorPreferences,
        themeName: "dark",
        version: 1,
      }),
    );
  });

  it("ignores storage write errors", () => {
    const storage = createMemoryStorage();
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() =>
      writeEditorPreferences(defaultEditorPreferences, storage),
    ).not.toThrow();
  });

  it("ignores missing storage on write", () => {
    expect(() =>
      writeEditorPreferences(defaultEditorPreferences, undefined),
    ).not.toThrow();
  });
});
