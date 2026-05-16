import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";

const overlayLayerDragType = "overlay-layer";
const pageDropType = "page-drop";
const pageDropIdPrefix = "page-drop:";
const pageHoverMoveDelayMs = 300;

const sidebarDndSensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 4 }),
    ],
  }),
  KeyboardSensor,
];

function getPageDropId(pageNumber: number) {
  return `${pageDropIdPrefix}${pageNumber}`;
}

function getPageNumberFromPageDropId(id: string | number) {
  if (typeof id !== "string" || !id.startsWith(pageDropIdPrefix)) {
    return null;
  }

  const pageNumber = Number(id.slice(pageDropIdPrefix.length));

  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null;
}

export {
  getPageDropId,
  getPageNumberFromPageDropId,
  overlayLayerDragType,
  pageDropType,
  pageHoverMoveDelayMs,
  sidebarDndSensors,
};
