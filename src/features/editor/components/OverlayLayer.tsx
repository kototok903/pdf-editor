import { Rnd } from "react-rnd";

import type {
  EditorOverlay,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { OverlayBox } from "@/features/editor/components/OverlayBox";
import {
  createOverlayRectAtPoint,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
} from "@/features/editor/lib/overlay-coordinate-utils";

type OverlayLayerProps = {
  editingOverlayId: string | null;
  isTextToolActive: boolean;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
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
  editingOverlayId,
  isTextToolActive,
  onClearSelection,
  onEditOverlay,
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

  return (
    <div
      className={
        isTextToolActive ? "absolute inset-0 cursor-text" : "absolute inset-0"
      }
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          if (isTextToolActive) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const pageSize = {
              height: bounds.height / scale,
              width: bounds.width / scale,
            };

            event.preventDefault();
            onPlaceTextOverlay(
              pageNumber,
              createOverlayRectAtPoint(
                {
                  x: (event.clientX - bounds.left) / scale,
                  y: (event.clientY - bounds.top) / scale,
                },
                pageSize,
              ),
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
        const isResizable =
          overlay.type === "image" ||
          overlay.type === "whiteout" ||
          (overlay.type === "text" && isSelected);

        return (
          <Rnd
            bounds="parent"
            disableDragging={isEditing}
            enableResizing={isResizable}
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
            position={{ x: viewportRect.x, y: viewportRect.y }}
            resizeHandleStyles={isSelected ? resizeHandleStyles : undefined}
            size={{ height: viewportRect.height, width: viewportRect.width }}
            style={isTextToolActive ? inactiveOverlayStyle : undefined}
          >
            <OverlayBox
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

const inactiveOverlayStyle = {
  pointerEvents: "none",
} as const;

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
