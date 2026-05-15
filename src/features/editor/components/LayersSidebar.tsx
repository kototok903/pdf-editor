import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";
import { LayerTile } from "@/features/editor/components/LayerTile";

type LayersSidebarProps = {
  currentPage: number;
  imageAssets: ImageAsset[];
  onSelectOverlay: (overlayId: string) => void;
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
};

function LayersSidebar({
  currentPage,
  imageAssets,
  onSelectOverlay,
  overlays,
  selectedOverlayId,
}: LayersSidebarProps) {
  const pageOverlays = getPageLayerOverlays(overlays, currentPage);

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
          pageOverlays.map((overlay) => (
            <LayerTile
              imageAssets={imageAssets}
              isSelected={overlay.id === selectedOverlayId}
              key={overlay.id}
              onClick={() => onSelectOverlay(overlay.id)}
              overlay={overlay}
            />
          ))
        ) : (
          <div className="w-16 h-16 rounded-md border border-dashed border-sidebar-border bg-page/70 text-center text-[11px] text-muted-foreground" />
        )}
      </div>
    </aside>
  );
}

export { LayersSidebar };
