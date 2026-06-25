import { memo, useCallback } from "react";
import { useSortable } from "@dnd-kit/react/sortable";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { LayerTile } from "@/features/editor/components/LayerTile";
import { overlayLayerDragType } from "@/features/editor/components/sidebar-dnd";

type LayersSidebarProps = {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  onSelectOverlay: (overlayId: string) => void;
  pageOverlays: EditorOverlay[];
  selectedOverlayId: string | null;
};

const LayersSidebar = memo(function LayersSidebar({
  imageAssetById,
  onSelectOverlay,
  pageOverlays,
  selectedOverlayId,
}: LayersSidebarProps) {
  return (
    <aside className="flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border p-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span>Layers</span>
          <span className="text-muted-foreground">{pageOverlays.length}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2">
        {pageOverlays.length > 0 ? (
          <>
            {pageOverlays.map((overlay, index) => (
              <SortableLayerTile
                imageAssetById={imageAssetById}
                index={index}
                isSelected={overlay.id === selectedOverlayId}
                key={overlay.id}
                onSelectOverlay={onSelectOverlay}
                overlay={overlay}
              />
            ))}
          </>
        ) : (
          <div className="size-16 rounded-md border border-dashed border-sidebar-border text-center text-[11px] text-muted-foreground" />
        )}
      </div>
    </aside>
  );
});

LayersSidebar.displayName = "LayersSidebar";

const SortableLayerTile = memo(function SortableLayerTile({
  imageAssetById,
  index,
  isSelected,
  onSelectOverlay,
  overlay,
}: {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  index: number;
  isSelected: boolean;
  onSelectOverlay: (overlayId: string) => void;
  overlay: EditorOverlay;
}) {
  const { handleRef, isDragging, ref } = useSortable({
    accept: overlayLayerDragType,
    group: overlay.pageId,
    id: overlay.id,
    index,
    type: overlayLayerDragType,
  });
  const setTileRef = useCallback(
    (element: HTMLButtonElement | null) => {
      ref(element);
      handleRef(element);
    },
    [handleRef, ref],
  );
  const handleClick = useCallback(() => {
    onSelectOverlay(overlay.id);
  }, [onSelectOverlay, overlay.id]);

  return (
    <LayerTile
      className={isDragging ? "cursor-grabbing opacity-80" : "cursor-grab"}
      imageAssetById={imageAssetById}
      isSelected={isSelected}
      onClick={handleClick}
      overlay={overlay}
      ref={setTileRef}
    />
  );
});

SortableLayerTile.displayName = "SortableLayerTile";

export { LayersSidebar };
