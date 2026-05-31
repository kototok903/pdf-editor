import {
  useEffect,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  readEditorPreferences,
  resolveEditorThemeName,
  writeEditorPreferences,
  type EditorPreferences,
  type EditorThemeName,
  type ResolvedEditorThemeName,
} from "@/features/editor/lib/editor-preferences";

const systemDarkThemeMediaQuery = "(prefers-color-scheme: dark)";

function useEditorPreferences(): [
  EditorPreferences,
  Dispatch<SetStateAction<EditorPreferences>>,
] {
  const [preferences, setPreferences] = useState(readEditorPreferences);

  useEffect(() => {
    writeEditorPreferences(preferences);
  }, [preferences]);

  return [preferences, setPreferences];
}

function useResolvedEditorTheme(
  themeName: EditorThemeName,
): ResolvedEditorThemeName {
  const systemThemeName = useSyncExternalStore(
    subscribeToSystemThemeChange,
    getSystemThemeName,
    getServerThemeName,
  );

  return resolveEditorThemeName(themeName, systemThemeName === "dark");
}

function subscribeToSystemThemeChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia?.(systemDarkThemeMediaQuery);

  if (!mediaQueryList) {
    return () => {};
  }

  mediaQueryList.addEventListener("change", onStoreChange);

  return () => {
    mediaQueryList.removeEventListener("change", onStoreChange);
  };
}

function getSystemThemeName(): ResolvedEditorThemeName {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia?.(systemDarkThemeMediaQuery).matches === true
    ? "dark"
    : "light";
}

function getServerThemeName(): ResolvedEditorThemeName {
  return "light";
}

export { useEditorPreferences, useResolvedEditorTheme };
