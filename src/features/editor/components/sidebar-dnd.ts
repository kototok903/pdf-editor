import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";

export const overlayLayerDragType = "overlay-layer";
export const pageDropType = "page-drop";
const pageDropIdPrefix = "page-drop:";
export const pageHoverMoveDelayMs = 300;

export const sidebarDndSensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 4 }),
    ],
  }),
  KeyboardSensor,
];

export function getPageDropId(pageNumber: number) {
  return `${pageDropIdPrefix}${pageNumber}`;
}

export function getPageNumberFromPageDropId(id: string | number) {
  if (typeof id !== "string" || !id.startsWith(pageDropIdPrefix)) {
    return null;
  }

  const pageNumber = Number(id.slice(pageDropIdPrefix.length));

  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null;
}
