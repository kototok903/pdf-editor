import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import {
  readEditorPreferences,
  writeEditorPreferences,
  type EditorPreferences,
} from "@/features/editor/lib/editor-preferences";

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

export { useEditorPreferences };
