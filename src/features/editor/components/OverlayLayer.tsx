import { Fragment } from "react";
import { Rnd } from "react-rnd";

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
  pdfRectToViewportRect,
  viewportRectToPdfRect,
} from "@/features/editor/lib/overlay-coordinate-utils";

type OverlayLayerProps = {
  activeImageAsset: ImageAsset | null;
  editingOverlayId: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isTextToolActive: boolean;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  pageNumber: number;
  scale: number;
  selectedOverlayId: string | null;
};

function OverlayLayer({
  activeImageAsset,
  editingOverlayId,
  imageAssets,
  isImageToolActive,
  isMarkToolActive,
  isTextToolActive,
  onClearSelection,
  onEditOverlay,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceTextOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  overlays,
  pageNumber,
  scale,
  selectedOverlayId,
}: OverlayLayerProps) {
  const pageOverlays = overlays.filter(
    (overlay) => overlay.pageNumber === pageNumber,
  );
  const isPlacingOverlay =
    isImageToolActive || isMarkToolActive || isTextToolActive;

  return (
    <div
      className={getOverlayLayerClassName({
        isImageToolActive,
        isMarkToolActive,
        isTextToolActive,
      })}
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
    >
      {pageOverlays.map((overlay) => {
        const viewportRect = pdfRectToViewportRect(overlay.rect, scale);
        const isSelected = overlay.id === selectedOverlayId;
        const isEditing = overlay.id === editingOverlayId;
        const boundsSelector = getOverlayBoundsSelector(overlay.id);
        const enabledResizeHandles = getEnabledResizeHandles({
          isSelected,
          overlay,
        });

        return (
          <Fragment key={overlay.id}>
            <div
              className="pointer-events-none absolute"
              data-overlay-bounds-id={overlay.id}
              style={getLooseOverlayBoundsStyle(viewportRect, scale)}
            />
            <Rnd
              bounds={boundsSelector}
              disableDragging={isEditing}
              enableResizing={enabledResizeHandles}
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                onSelectOverlay(overlay.id);
                if (editingOverlayId && editingOverlayId !== overlay.id) {
                  onEditOverlay(null);
                }
              }}
              onDoubleClick={(event: MouseEvent) => {
                event.stopPropagation();
                onSelectOverlay(overlay.id);
                if (overlay.type === "text") {
                  onEditOverlay(overlay.id);
                }
              }}
              onDragStart={() => {
                onSelectOverlay(overlay.id);
                onEditOverlay(null);
              }}
              onDragStop={(_, data) => {
                onUpdateOverlayRect(
                  overlay.id,
                  clampMovedOverlayRect(
                    {
                      ...overlay.rect,
                      x: data.x / scale,
                      y: data.y / scale,
                    },
                    getPageSizeFromEventTarget(data.node.parentElement, scale),
                  ),
                );
              }}
              onResizeStart={() => {
                onSelectOverlay(overlay.id);
                onEditOverlay(null);
              }}
              onResizeStop={(_, __, ref, ___, position) => {
                onUpdateOverlayRect(
                  overlay.id,
                  viewportRectToPdfRect(
                    {
                      height: ref.offsetHeight,
                      width: ref.offsetWidth,
                      x: position.x,
                      y: position.y,
                    },
                    scale,
                  ),
                );
              }}
              lockAspectRatio={
                overlay.type === "image" || overlay.type === "mark"
              }
              position={{ x: viewportRect.x, y: viewportRect.y }}
              resizeHandleStyles={isSelected ? resizeHandleStyles : undefined}
              size={{ height: viewportRect.height, width: viewportRect.width }}
              style={isPlacingOverlay ? inactiveOverlayStyle : undefined}
            >
              <OverlayBox
                imageAssets={imageAssets}
                isEditing={isEditing}
                isSelected={isSelected}
                onTextChange={(overlayId, text) => {
                  onUpdateTextOverlay(overlayId, { text });
                }}
                overlay={overlay}
                scale={scale}
              />
            </Rnd>
          </Fragment>
        );
      })}
    </div>
  );
}

const handleStyle = {
  backgroundColor: "var(--primary)",
  border: "1px solid var(--primary-foreground)",
  height: "8px",
  width: "8px",
};

function getOverlayLayerClassName({
  isImageToolActive,
  isMarkToolActive,
  isTextToolActive,
}: {
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isTextToolActive: boolean;
}) {
  if (isImageToolActive || isMarkToolActive) {
    return "absolute inset-0 cursor-crosshair";
  }

  if (isTextToolActive) {
    return "absolute inset-0 cursor-text";
  }

  return "absolute inset-0";
}

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

const inactiveOverlayStyle = {
  pointerEvents: "none",
} as const;

function getOverlayBoundsSelector(overlayId: string) {
  return `[data-overlay-bounds-id="${overlayId}"]`;
}

function getLooseOverlayBoundsStyle(rect: ViewportRect, scale: number) {
  const visibleX = Math.min(8 * scale, rect.width);
  const visibleY = Math.min(8 * scale, rect.height);
  const width = rect.width;
  const height = rect.height;

  return {
    height: `calc(100% + ${2 * height - 2 * visibleY}px)`,
    left: visibleX - width,
    top: visibleY - height,
    width: `calc(100% + ${2 * width - 2 * visibleX}px)`,
  };
}

function getEnabledResizeHandles({
  isSelected,
  overlay,
}: {
  isSelected: boolean;
  overlay: EditorOverlay;
}) {
  if (overlay.type === "image" || overlay.type === "mark") {
    return isSelected ? cornerResizeHandles : false;
  }

  if (overlay.type === "text") {
    return isSelected;
  }

  if (overlay.type === "whiteout") {
    return true;
  }

  return false;
}

const cornerResizeHandles = {
  bottom: false,
  bottomLeft: true,
  bottomRight: true,
  left: false,
  right: false,
  top: false,
  topLeft: true,
  topRight: true,
};

const resizeHandleStyles = {
  bottom: handleStyle,
  bottomLeft: handleStyle,
  bottomRight: handleStyle,
  left: handleStyle,
  right: handleStyle,
  top: handleStyle,
  topLeft: handleStyle,
  topRight: handleStyle,
};

export { OverlayLayer };
