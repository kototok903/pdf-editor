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
import { isStandardTextFontId } from "@/features/editor/lib/text-font-id-utils";

export type ResolvedEditorThemeName = "dark" | "light";
export type EditorThemeName = "system" | ResolvedEditorThemeName;

export type EditorPreferences = {
  isLayersSidebarOpen: boolean;
  isPagesSidebarOpen: boolean;
  isSearchSidebarOpen: boolean;
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

export const editorPreferencesStorageKey = "pdf-editor:editor-preferences:v1";
export const minEditorZoom = 0.5;
export const maxEditorZoom = 2;
export const defaultEditorPreferences: EditorPreferences = {
  isLayersSidebarOpen: false,
  isPagesSidebarOpen: true,
  isSearchSidebarOpen: false,
  markDefaults: defaultMarkSettings,
  textDefaults: defaultTextOverlay,
  themeName: "system",
  whiteoutDefaults: defaultWhiteoutOverlay,
  zoom: 1,
};

export function readEditorPreferences(
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

export function writeEditorPreferences(
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

export function clearEditorPreferences(
  storage: Storage | undefined = getBrowserStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(editorPreferencesStorageKey);
  } catch {
    // localStorage can be unavailable; clearing app data should stay best-effort.
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
    isSearchSidebarOpen: asBoolean(
      value.isSearchSidebarOpen,
      defaultEditorPreferences.isSearchSidebarOpen,
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
  return typeof value === "string" && isStandardTextFontId(value)
    ? value
    : fallback;
}

function asMarkType(value: unknown, fallback: MarkType) {
  return typeof value === "string" && isSupportedMarkType(value)
    ? value
    : fallback;
}

function asThemeName(value: unknown, fallback: EditorThemeName) {
  return value === "system" || value === "dark" || value === "light"
    ? value
    : fallback;
}

export function resolveEditorThemeName(
  themeName: EditorThemeName,
  systemPrefersDark: boolean,
): ResolvedEditorThemeName {
  if (themeName === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return themeName;
}
