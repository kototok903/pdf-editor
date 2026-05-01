import { Rnd } from "react-rnd";

import type { EditorOverlay, PdfRect } from "@/features/editor/editor-types";
import { OverlayBox } from "@/features/editor/components/OverlayBox";
import {
  pdfRectToViewportRect,
  viewportRectToPdfRect,
} from "@/features/editor/lib/overlay-coordinate-utils";

type OverlayLayerProps = {
  onClearSelection: () => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  pageNumber: number;
  scale: number;
  selectedOverlayId: string | null;
};

function OverlayLayer({
  onClearSelection,
  onSelectOverlay,
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
      className="absolute inset-0"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClearSelection();
        }
      }}
    >
      {pageOverlays.map((overlay) => {
        const viewportRect = pdfRectToViewportRect(overlay.rect, scale);
        const isResizable =
          overlay.type === "image" || overlay.type === "whiteout";

        return (
          <Rnd
            bounds="parent"
            enableResizing={isResizable}
            key={overlay.id}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              onSelectOverlay(overlay.id);
            }}
            onDragStart={() => {
              onSelectOverlay(overlay.id);
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
            size={{ height: viewportRect.height, width: viewportRect.width }}
          >
            <OverlayBox
              isSelected={overlay.id === selectedOverlayId}
              type={overlay.type}
            />
          </Rnd>
        );
      })}
    </div>
  );
}

export { OverlayLayer };
