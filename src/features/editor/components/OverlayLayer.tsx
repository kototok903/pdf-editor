import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import Moveable, {
  type OnDrag,
  type OnDragStart,
  type OnRotate,
  type OnRotateStart,
  type OnResize,
  type OnResizeStart,
} from "react-moveable";

import { cn } from "@/lib/utils";
import type {
  EditorOverlay,
  ImageAsset,
  PdfRect,
  TextOverlayPatch,
  ViewportRect,
} from "@/features/editor/editor-types";
import { OverlayBox } from "@/features/editor/components/OverlayBox";
import {
  clampMovedOverlayRect,
  createImageOverlayRectAtPoint,
  createMarkOverlayRectAtPoint,
  createOverlayRectAtPoint,
  createRectFromDragPoints,
  normalizeRotationDegrees,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
} from "@/features/editor/lib/overlay-coordinate-utils";
import {
  getOverlayRotationDegrees,
  isRotatableOverlay,
} from "@/features/editor/lib/overlay-capabilities";

type OverlayLayerProps = {
  activeImageAsset: ImageAsset | null;
  activeSignatureAsset: ImageAsset | null;
  editingOverlayId: string | null;
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isSignatureToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
  onCancelActiveTool: () => void;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceSignatureOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceWhiteoutOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  onUpdateOverlayRotation: (overlayId: string, rotationDegrees: number) => void;
  pageOverlays: EditorOverlay[];
  pageNumber: number;
  scale: number;
  selectedOverlayId: string | null;
  whiteoutColor: string;
};

type WhiteoutDraft = {
  currentPoint: { x: number; y: number };
  pageSize: { height: number; width: number };
  pointerId: number;
  startPoint: { x: number; y: number };
};

type TransformDraft = {
  overlayId: string;
  rect: ViewportRect;
};

type MoveableEventData = {
  overlayId?: string;
  rotationDegrees?: number;
  startRect?: ViewportRect;
  startRotationDegrees?: number;
};

const OverlayLayer = memo(function OverlayLayer({
  activeImageAsset,
  activeSignatureAsset,
  editingOverlayId,
  imageAssetById,
  isImageToolActive,
  isMarkToolActive,
  isSignatureToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
  onCancelActiveTool,
  onClearSelection,
  onEditOverlay,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceSignatureOverlay,
  onPlaceTextOverlay,
  onPlaceWhiteoutOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  onUpdateOverlayRotation,
  pageOverlays,
  pageNumber,
  scale,
  selectedOverlayId,
  whiteoutColor,
}: OverlayLayerProps) {
  const [whiteoutDraft, setWhiteoutDraft] = useState<WhiteoutDraft | null>(
    null,
  );
  const [selectedOverlayElement, setSelectedOverlayElement] =
    useState<HTMLDivElement | null>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);
  const transformDraftRef = useRef<TransformDraft | null>(null);
  const selectedOverlay =
    pageOverlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;
  const isPlacingOverlay =
    isImageToolActive ||
    isMarkToolActive ||
    isSignatureToolActive ||
    isTextToolActive ||
    isWhiteoutToolActive;
  const whiteoutDraftRect = whiteoutDraft
    ? createRectFromDragPoints(
        whiteoutDraft.startPoint,
        whiteoutDraft.currentPoint,
        whiteoutDraft.pageSize,
      )
    : null;
  const isSelectedOverlayEditing =
    Boolean(selectedOverlay) && selectedOverlay?.id === editingOverlayId;
  const canTransformSelectedOverlay =
    Boolean(selectedOverlay) && !isPlacingOverlay && !isSelectedOverlayEditing;
  const canResizeSelectedOverlay =
    canTransformSelectedOverlay && selectedOverlay
      ? canResizeOverlay(selectedOverlay)
      : false;
  const selectedRenderDirections = selectedOverlay
    ? getMoveableRenderDirections(selectedOverlay)
    : [];
  const selectedKeepRatio = selectedOverlay
    ? shouldKeepOverlayAspectRatio(selectedOverlay)
    : false;
  const selectedRotationDegrees = getOverlayRotationDegrees(selectedOverlay);
  const canRotateSelectedOverlay =
    canTransformSelectedOverlay && isRotatableOverlay(selectedOverlay);

  function commitTransformDraft() {
    const draft = transformDraftRef.current;

    if (!draft) {
      return;
    }

    const pageSize = getPageSizeFromElement(selectedOverlayElement, scale);

    onUpdateOverlayRect(
      draft.overlayId,
      clampMovedOverlayRect(
        viewportRectToPdfRect(draft.rect, scale),
        pageSize,
        minVisibleOverlayViewportSize / scale,
        selectedRotationDegrees,
      ),
    );
    transformDraftRef.current = null;
    requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });
  }

  function getSelectedViewportRect() {
    if (!selectedOverlay) {
      return null;
    }

    return pdfRectToViewportRect(selectedOverlay.rect, scale);
  }

  const setSelectedOverlayRef = useCallback(
    (element: HTMLDivElement | null) => {
      setSelectedOverlayElement(element);
    },
    [],
  );
  const handleTextChange = useCallback(
    (overlayId: string, text: string) => {
      onUpdateTextOverlay(overlayId, { text });
    },
    [onUpdateTextOverlay],
  );

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      moveableRef.current?.updateRect();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    editingOverlayId,
    isPlacingOverlay,
    scale,
    selectedRotationDegrees,
    selectedOverlay?.rect.height,
    selectedOverlay?.rect.width,
    selectedOverlay?.rect.x,
    selectedOverlay?.rect.y,
    selectedOverlayElement,
    selectedOverlayId,
  ]);

  return (
    <div
      data-overlay-layer-page={pageNumber}
      className={getOverlayLayerClassName({
        isImageToolActive,
        isMarkToolActive,
        isSignatureToolActive,
        isTextToolActive,
        isWhiteoutToolActive,
      })}
      ref={overlayLayerRef}
      style={getMoveableHandleOffsetStyle(selectedRotationDegrees)}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          const pageSize = {
            height: bounds.height / scale,
            width: bounds.width / scale,
          };
          const point = {
            x: (event.clientX - bounds.left) / scale,
            y: (event.clientY - bounds.top) / scale,
          };
          const viewportPoint = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };

          if (isWhiteoutToolActive) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setWhiteoutDraft({
              currentPoint: viewportPoint,
              pageSize: getViewportPageSizeFromElement(event.currentTarget),
              pointerId: event.pointerId,
              startPoint: viewportPoint,
            });
            return;
          }

          if (isImageToolActive && activeImageAsset) {
            event.preventDefault();
            onPlaceImageOverlay(
              pageNumber,
              createImageOverlayRectAtPoint(point, pageSize, activeImageAsset),
            );
            return;
          }

          if (isMarkToolActive) {
            event.preventDefault();
            onPlaceMarkOverlay(
              pageNumber,
              createMarkOverlayRectAtPoint(point, pageSize),
            );
            return;
          }

          if (isSignatureToolActive && activeSignatureAsset) {
            event.preventDefault();
            onPlaceSignatureOverlay(
              pageNumber,
              createImageOverlayRectAtPoint(
                point,
                pageSize,
                activeSignatureAsset,
              ),
            );
            return;
          }

          if (isTextToolActive) {
            event.preventDefault();
            onPlaceTextOverlay(
              pageNumber,
              createOverlayRectAtPoint(point, pageSize),
            );
            return;
          }

          onClearSelection();
          onEditOverlay(null);
        }
      }}
      onPointerMove={(event) => {
        if (
          !whiteoutDraft ||
          event.pointerId !== whiteoutDraft.pointerId ||
          !(event.currentTarget instanceof HTMLElement)
        ) {
          return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();

        setWhiteoutDraft({
          ...whiteoutDraft,
          currentPoint: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
        });
      }}
      onPointerUp={(event) => {
        if (
          !whiteoutDraft ||
          event.pointerId !== whiteoutDraft.pointerId ||
          !(event.currentTarget instanceof HTMLElement)
        ) {
          return;
        }

        event.preventDefault();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const draftRect = createRectFromDragPoints(
          whiteoutDraft.startPoint,
          {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
          getViewportPageSizeFromElement(event.currentTarget),
        );
        setWhiteoutDraft(null);

        if (
          draftRect.width >= minWhiteoutViewportSideSize &&
          draftRect.height >= minWhiteoutViewportSideSize
        ) {
          onPlaceWhiteoutOverlay(
            pageNumber,
            viewportRectToPdfRect(draftRect, scale),
          );
          return;
        }

        onCancelActiveTool();
      }}
      onPointerCancel={(event) => {
        if (!whiteoutDraft || event.pointerId !== whiteoutDraft.pointerId) {
          return;
        }

        setWhiteoutDraft(null);
        onCancelActiveTool();
      }}
    >
      {whiteoutDraftRect && (
        <div
          className="pointer-events-none absolute border border-primary ring-2 ring-primary/25"
          style={{
            backgroundColor: whiteoutColor,
            height: whiteoutDraftRect.height,
            left: whiteoutDraftRect.x,
            opacity: 0.85,
            top: whiteoutDraftRect.y,
            width: whiteoutDraftRect.width,
          }}
        />
      )}
      {pageOverlays.map((overlay) => {
        const viewportRect = pdfRectToViewportRect(overlay.rect, scale);
        const isSelected = overlay.id === selectedOverlayId;
        const isEditing = overlay.id === editingOverlayId;

        return (
          <div
            className="absolute"
            data-editor-overlay-id={overlay.id}
            key={overlay.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelectOverlay(overlay.id);
              if (editingOverlayId && editingOverlayId !== overlay.id) {
                onEditOverlay(null);
              }
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onSelectOverlay(overlay.id);
              if (overlay.type === "text") {
                onEditOverlay(overlay.id);
              }
            }}
            onMouseDown={(event) => {
              if (
                event.button !== 0 ||
                isSelected ||
                isEditing ||
                isPlacingOverlay
              ) {
                return;
              }

              const target = event.currentTarget;
              const nativeEvent = event.nativeEvent;

              onSelectOverlay(overlay.id);
              onEditOverlay(null);
              setSelectedOverlayElement(target);
              void moveableRef.current?.waitToChangeTarget().then(() => {
                moveableRef.current?.dragStart(nativeEvent, target);
              });
            }}
            ref={isSelected ? setSelectedOverlayRef : undefined}
            style={{
              cursor: isPlacingOverlay || isEditing ? undefined : "all-scroll",
              height: viewportRect.height,
              left: viewportRect.x,
              pointerEvents: isPlacingOverlay ? "none" : "auto",
              top: viewportRect.y,
              transform: getOverlayTransform(overlay),
              transformOrigin: "center center",
              width: viewportRect.width,
            }}
          >
            <OverlayBox
              imageAssetById={imageAssetById}
              isEditing={isEditing}
              isSelected={isSelected}
              onTextChange={handleTextChange}
              overlay={overlay}
              scale={scale}
            />
          </div>
        );
      })}
      <Moveable
        className={cn(
          "editor-moveable-controls",
          getMoveableCursorClassName(selectedRotationDegrees),
        )}
        container={null}
        draggable={canTransformSelectedOverlay}
        edge={false}
        flushSync={flushSync}
        keepRatio={selectedKeepRatio}
        onDrag={(event: OnDrag) => {
          const datas = event.datas as MoveableEventData;

          if (!datas.overlayId || !datas.startRect) {
            return;
          }

          const nextRect = clampViewportOverlayRect(
            {
              ...datas.startRect,
              x: datas.startRect.x + event.beforeDist[0],
              y: datas.startRect.y + event.beforeDist[1],
            },
            event.target,
            scale,
            datas.rotationDegrees,
          );
          const nextDraft = {
            overlayId: datas.overlayId,
            rect: nextRect,
          };

          transformDraftRef.current = nextDraft;
          applyViewportRectToElement(event.target, nextDraft.rect);
        }}
        onDragEnd={() => {
          commitTransformDraft();
        }}
        onDragStart={(event: OnDragStart) => {
          const selectedRect = getSelectedViewportRect();

          if (!selectedOverlay || !selectedRect) {
            return;
          }

          onSelectOverlay(selectedOverlay.id);
          onEditOverlay(null);
          event.datas.overlayId = selectedOverlay.id;
          event.datas.rotationDegrees =
            getOverlayRotationDegrees(selectedOverlay);
          event.datas.startRect = selectedRect;
        }}
        onRotate={(event: OnRotate) => {
          const datas = event.datas as MoveableEventData;

          if (!datas.overlayId) {
            return;
          }

          applyRotationToElement(
            event.target,
            normalizeRotationDegrees(event.rotation),
          );
          applyMoveableHandleOffsetStyle(
            overlayLayerRef.current,
            event.rotation,
          );
        }}
        onRotateEnd={(event) => {
          const datas = event.datas as MoveableEventData;

          if (!datas.overlayId || datas.startRotationDegrees === undefined) {
            return;
          }

          onUpdateOverlayRotation(
            datas.overlayId,
            normalizeRotationDegrees(
              event.lastEvent?.rotation ?? datas.startRotationDegrees,
            ),
          );
          requestAnimationFrame(() => {
            moveableRef.current?.updateRect();
          });
        }}
        onRotateStart={(event: OnRotateStart) => {
          if (!selectedOverlay) {
            return;
          }

          const rotationDegrees = getOverlayRotationDegrees(selectedOverlay);

          onSelectOverlay(selectedOverlay.id);
          onEditOverlay(null);
          event.set(rotationDegrees);
          applyMoveableHandleOffsetStyle(
            overlayLayerRef.current,
            rotationDegrees,
          );
          event.datas.overlayId = selectedOverlay.id;
          event.datas.startRotationDegrees = rotationDegrees;
        }}
        onResize={(event: OnResize) => {
          const datas = event.datas as MoveableEventData;

          if (!datas.overlayId || !datas.startRect) {
            return;
          }

          const nextRect = clampViewportOverlayRect(
            {
              height: event.height,
              width: event.width,
              x: datas.startRect.x + event.drag.beforeDist[0],
              y: datas.startRect.y + event.drag.beforeDist[1],
            },
            event.target,
            scale,
            datas.rotationDegrees,
          );
          const nextDraft = {
            overlayId: datas.overlayId,
            rect: nextRect,
          };

          transformDraftRef.current = nextDraft;
          applyViewportRectToElement(event.target, nextDraft.rect);
        }}
        onResizeEnd={() => {
          commitTransformDraft();
        }}
        onResizeStart={(event: OnResizeStart) => {
          const selectedRect = getSelectedViewportRect();

          if (!selectedOverlay || !selectedRect) {
            return;
          }

          onSelectOverlay(selectedOverlay.id);
          onEditOverlay(null);
          event.setMin([minMoveableSideSize, minMoveableSideSize]);
          event.datas.overlayId = selectedOverlay.id;
          event.datas.rotationDegrees =
            getOverlayRotationDegrees(selectedOverlay);
          event.datas.startRect = selectedRect;
        }}
        origin={false}
        ref={moveableRef}
        renderDirections={selectedRenderDirections}
        resizable={canResizeSelectedOverlay}
        rotatable={canRotateSelectedOverlay}
        rotationPosition="top"
        snappable={canRotateSelectedOverlay ? ["rotatable"] : false}
        snapRotationDegrees={snapRotationDegrees}
        snapRotationThreshold={5}
        target={selectedOverlayElement}
        throttleDrag={0}
        throttleRotate={1}
        throttleResize={1}
        zoom={1}
      />
    </div>
  );
});

OverlayLayer.displayName = "OverlayLayer";

function getOverlayLayerClassName({
  isImageToolActive,
  isMarkToolActive,
  isSignatureToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
}: {
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isSignatureToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
}) {
  if (
    isImageToolActive ||
    isMarkToolActive ||
    isSignatureToolActive ||
    isWhiteoutToolActive
  ) {
    return "pointer-events-auto absolute inset-0 z-20 cursor-crosshair";
  }

  if (isTextToolActive) {
    return "pointer-events-auto absolute inset-0 z-20 cursor-text";
  }

  return "pointer-events-none absolute inset-0 z-20";
}

function getViewportPageSizeFromElement(element: Element | null) {
  const bounds = element?.getBoundingClientRect();

  if (!bounds) {
    return { height: 0, width: 0 };
  }

  return {
    height: bounds.height,
    width: bounds.width,
  };
}

const minWhiteoutViewportSideSize = 6;
const minVisibleOverlayViewportSize = 8;

function getPageSizeFromEventTarget(
  element: HTMLElement | null,
  scale: number,
) {
  const bounds = element?.getBoundingClientRect();

  if (!bounds) {
    return { height: 0, width: 0 };
  }

  return {
    height: bounds.height / scale,
    width: bounds.width / scale,
  };
}

function canResizeOverlay(overlay: EditorOverlay) {
  return (
    overlay.type === "image" ||
    overlay.type === "mark" ||
    overlay.type === "signature" ||
    overlay.type === "text" ||
    overlay.type === "whiteout"
  );
}

function getMoveableRenderDirections(overlay: EditorOverlay) {
  if (
    overlay.type === "image" ||
    overlay.type === "mark" ||
    overlay.type === "signature"
  ) {
    return ["nw", "ne", "sw", "se"];
  }

  if (overlay.type === "text" || overlay.type === "whiteout") {
    return ["n", "nw", "ne", "s", "se", "sw", "e", "w"];
  }

  return [];
}

function shouldKeepOverlayAspectRatio(overlay: EditorOverlay) {
  return (
    overlay.type === "image" ||
    overlay.type === "mark" ||
    overlay.type === "signature"
  );
}

function getOverlayTransform(overlay: EditorOverlay) {
  const rotationDegrees = getOverlayRotationDegrees(overlay);

  return rotationDegrees === 0 ? undefined : `rotate(${rotationDegrees}deg)`;
}

function getMoveableCursorClassName(rotationDegrees: number) {
  const cursorRotation = normalizeRotationDegrees(
    Math.round(rotationDegrees / 45) * 45,
  );

  return `editor-moveable-cursor-${cursorRotation}`;
}

type MoveableHandleOffsetStyle = CSSProperties & {
  "--moveable-ne-offset-x": string;
  "--moveable-ne-offset-y": string;
  "--moveable-nw-offset-x": string;
  "--moveable-nw-offset-y": string;
  "--moveable-se-offset-x": string;
  "--moveable-se-offset-y": string;
  "--moveable-sw-offset-x": string;
  "--moveable-sw-offset-y": string;
};

function getMoveableHandleOffsetStyle(
  rotationDegrees: number,
): MoveableHandleOffsetStyle {
  const radians = (normalizeRotationDegrees(rotationDegrees) * Math.PI) / 180;
  const nw = rotateVector(
    -moveableCornerHandleOffset,
    -moveableCornerHandleOffset,
    radians,
  );
  const ne = rotateVector(
    moveableCornerHandleOffset,
    -moveableCornerHandleOffset,
    radians,
  );
  const sw = rotateVector(
    -moveableCornerHandleOffset,
    moveableCornerHandleOffset,
    radians,
  );
  const se = rotateVector(
    moveableCornerHandleOffset,
    moveableCornerHandleOffset,
    radians,
  );

  return {
    "--moveable-ne-offset-x": `${ne.x}px`,
    "--moveable-ne-offset-y": `${ne.y}px`,
    "--moveable-nw-offset-x": `${nw.x}px`,
    "--moveable-nw-offset-y": `${nw.y}px`,
    "--moveable-se-offset-x": `${se.x}px`,
    "--moveable-se-offset-y": `${se.y}px`,
    "--moveable-sw-offset-x": `${sw.x}px`,
    "--moveable-sw-offset-y": `${sw.y}px`,
  };
}

function applyMoveableHandleOffsetStyle(
  element: HTMLElement | null,
  rotationDegrees: number,
) {
  if (!element) {
    return;
  }

  const offsetStyle = getMoveableHandleOffsetStyle(rotationDegrees);

  for (const [property, value] of Object.entries(offsetStyle)) {
    element.style.setProperty(property, value);
  }
}

function rotateVector(x: number, y: number, radians: number) {
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

function getPageSizeFromElement(element: HTMLElement | null, scale: number) {
  return getPageSizeFromEventTarget(element?.parentElement ?? null, scale);
}

function applyViewportRectToElement(
  element: HTMLElement | SVGElement,
  rect: ViewportRect,
) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.style.height = `${rect.height}px`;
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${rect.width}px`;
}

function applyRotationToElement(
  element: HTMLElement | SVGElement,
  rotationDegrees: number,
) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.style.transform =
    rotationDegrees === 0 ? "" : `rotate(${rotationDegrees}deg)`;
  element.style.transformOrigin = "center center";
}

function clampViewportOverlayRect(
  rect: ViewportRect,
  element: HTMLElement | SVGElement,
  scale: number,
  rotationDegrees = 0,
) {
  const pageSize = getPageSizeFromElement(
    element instanceof HTMLElement ? element : null,
    scale,
  );

  return pdfRectToViewportRect(
    clampMovedOverlayRect(
      viewportRectToPdfRect(rect, scale),
      pageSize,
      minVisibleOverlayViewportSize / scale,
      rotationDegrees,
    ),
    scale,
  );
}

const minMoveableSideSize = 8;
const moveableCornerHandleOffset = 6;
const snapRotationDegrees = [0, 45, 90, 135, 180, 225, 270, 315, 360];

export { OverlayLayer };
