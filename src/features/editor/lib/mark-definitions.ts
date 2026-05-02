import type { MarkType } from "@/features/editor/editor-types";
import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";

type MarkDefinition = {
  label: string;
  type: MarkType;
};

const markDefinitions: MarkDefinition[] = [
  { label: "Check", type: "check" },
  { label: "X", type: "x" },
  { label: "Dot", type: "dot" },
  { label: "Ballot X", type: "ballot-x" },
  { label: "Heavy Check", type: "heavy-check" },
  { label: "Slash X", type: "slash-x" },
];

const defaultMarkSettings = {
  color: defaultTextOverlay.color,
  markType: "check" as MarkType,
};

function getMarkLabel(markType: MarkType) {
  return (
    markDefinitions.find((definition) => definition.type === markType)?.label ??
    "Mark"
  );
}

export { defaultMarkSettings, getMarkLabel, markDefinitions };
