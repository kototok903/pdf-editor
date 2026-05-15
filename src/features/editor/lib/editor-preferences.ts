import type {
  MarkType,
  TextFontId,
  TextOverlayDefaults,
  WhiteoutOverlayDefaults,
} from "@/features/editor/editor-types";
import {
  defaultMarkSettings,
  isSupportedMarkType,
} from "@/features/editor/lib/mark-definitions";
import {
  defaultTextOverlay,
  defaultWhiteoutOverlay,
} from "@/features/editor/lib/overlay-defaults";

type EditorThemeName = "dark" | "light";

type EditorPreferences = {
  isLayersSidebarOpen: boolean;
  isPagesSidebarOpen: boolean;
  markDefaults: {
    color: string;
    markType: MarkType;
  };
  textDefaults: TextOverlayDefaults;
  themeName: EditorThemeName;
  whiteoutDefaults: WhiteoutOverlayDefaults;
  zoom: number;
};

type PersistedEditorPreferencesV1 = EditorPreferences & {
  version: 1;
};

const editorPreferencesStorageKey = "pdf-editor:editor-preferences:v1";
const minEditorZoom = 0.5;
const maxEditorZoom = 2;
const defaultEditorPreferences: EditorPreferences = {
  isLayersSidebarOpen: false,
  isPagesSidebarOpen: true,
  markDefaults: defaultMarkSettings,
  textDefaults: defaultTextOverlay,
  themeName: "light",
  whiteoutDefaults: defaultWhiteoutOverlay,
  zoom: 1,
};

const supportedTextFontIds = new Set<TextFontId>([
  "courier",
  "helvetica",
  "times-roman",
]);

function readEditorPreferences(
  storage: Storage | undefined = getBrowserStorage(),
): EditorPreferences {
  if (!storage) {
    return defaultEditorPreferences;
  }

  try {
    return normalizeEditorPreferences(
      JSON.parse(storage.getItem(editorPreferencesStorageKey) ?? "null"),
    );
  } catch {
    return defaultEditorPreferences;
  }
}

function writeEditorPreferences(
  preferences: EditorPreferences,
  storage: Storage | undefined = getBrowserStorage(),
) {
  if (!storage) {
    return;
  }

  const persistedPreferences: PersistedEditorPreferencesV1 = {
    ...normalizeEditorPreferences({ ...preferences, version: 1 }),
    version: 1,
  };

  try {
    storage.setItem(
      editorPreferencesStorageKey,
      JSON.stringify(persistedPreferences),
    );
  } catch {
    // localStorage can be unavailable or full; the editor should still work.
  }
}

function normalizeEditorPreferences(value: unknown): EditorPreferences {
  if (!isRecord(value)) {
    return defaultEditorPreferences;
  }

  const textDefaults = isRecord(value.textDefaults) ? value.textDefaults : {};
  const markDefaults = isRecord(value.markDefaults) ? value.markDefaults : {};
  const whiteoutDefaults = isRecord(value.whiteoutDefaults)
    ? value.whiteoutDefaults
    : {};

  return {
    isLayersSidebarOpen: asBoolean(
      value.isLayersSidebarOpen,
      defaultEditorPreferences.isLayersSidebarOpen,
    ),
    isPagesSidebarOpen: asBoolean(
      value.isPagesSidebarOpen,
      defaultEditorPreferences.isPagesSidebarOpen,
    ),
    markDefaults: {
      color: asColor(
        markDefaults.color,
        defaultEditorPreferences.markDefaults.color,
      ),
      markType: asMarkType(
        markDefaults.markType,
        defaultEditorPreferences.markDefaults.markType,
      ),
    },
    textDefaults: {
      color: asColor(
        textDefaults.color,
        defaultEditorPreferences.textDefaults.color,
      ),
      fontId: asTextFontId(
        textDefaults.fontId,
        defaultEditorPreferences.textDefaults.fontId,
      ),
      fontSize: asNumber(
        textDefaults.fontSize,
        defaultEditorPreferences.textDefaults.fontSize,
        { max: 96, min: 8 },
      ),
      text: asString(
        textDefaults.text,
        defaultEditorPreferences.textDefaults.text,
      ),
    },
    themeName: asThemeName(value.themeName, defaultEditorPreferences.themeName),
    whiteoutDefaults: {
      color: asColor(
        whiteoutDefaults.color,
        defaultEditorPreferences.whiteoutDefaults.color,
      ),
    },
    zoom: asNumber(value.zoom, defaultEditorPreferences.zoom, {
      max: maxEditorZoom,
      min: minEditorZoom,
    }),
  };
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

function asNumber(
  value: unknown,
  fallback: number,
  { max, min }: { max: number; min: number },
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function asTextFontId(value: unknown, fallback: TextFontId) {
  return typeof value === "string" &&
    supportedTextFontIds.has(value as TextFontId)
    ? (value as TextFontId)
    : fallback;
}

function asMarkType(value: unknown, fallback: MarkType) {
  return typeof value === "string" && isSupportedMarkType(value)
    ? value
    : fallback;
}

function asThemeName(value: unknown, fallback: EditorThemeName) {
  return value === "dark" || value === "light" ? value : fallback;
}

export {
  defaultEditorPreferences,
  editorPreferencesStorageKey,
  maxEditorZoom,
  minEditorZoom,
  readEditorPreferences,
  writeEditorPreferences,
};
export type { EditorPreferences, EditorThemeName };
