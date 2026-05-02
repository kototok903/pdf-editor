import { Rnd } from "react-rnd";

import type {
  EditorOverlay,
  ImageAsset,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { OverlayBox } from "@/features/editor/components/OverlayBox";
import {
  createImageOverlayRectAtPoint,
  createOverlayRectAtPoint,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
} from "@/features/editor/lib/overlay-coordinate-utils";

type OverlayLayerProps = {
  activeImageAsset: ImageAsset | null;
  editingOverlayId: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isTextToolActive: boolean;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
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
  isTextToolActive,
  onClearSelection,
  onEditOverlay,
  onPlaceImageOverlay,
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
  const isPlacingOverlay = isImageToolActive || isTextToolActive;

  return (
    <div
      className={getOverlayLayerClassName({
        isImageToolActive,
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
        const enabledResizeHandles = getEnabledResizeHandles({
          isSelected,
          overlay,
        });

        return (
          <Rnd
            bounds="parent"
            disableDragging={isEditing}
            enableResizing={enabledResizeHandles}
            key={overlay.id}
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
              onUpdateOverlayRect(overlay.id, {
                ...overlay.rect,
                x: data.x / scale,
                y: data.y / scale,
              });
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
            lockAspectRatio={overlay.type === "image"}
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
  isTextToolActive,
}: {
  isImageToolActive: boolean;
  isTextToolActive: boolean;
}) {
  if (isImageToolActive) {
    return "absolute inset-0 cursor-crosshair";
  }

  if (isTextToolActive) {
    return "absolute inset-0 cursor-text";
  }

  return "absolute inset-0";
}

const inactiveOverlayStyle = {
  pointerEvents: "none",
} as const;

function getEnabledResizeHandles({
  isSelected,
  overlay,
}: {
  isSelected: boolean;
  overlay: EditorOverlay;
}) {
  if (overlay.type === "image") {
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
