import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";
import { LayerTile } from "@/features/editor/components/LayerTile";

type LayersSidebarProps = {
  currentPage: number;
  imageAssets: ImageAsset[];
  onMoveOverlayLayer: ({
    insertBelowOverlayId,
    overlayId,
    pageNumber,
  }: {
    insertBelowOverlayId?: string | null;
    overlayId: string;
    pageNumber: number;
  }) => void;
  onSelectOverlay: (overlayId: string) => void;
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
};

function LayersSidebar({
  currentPage,
  imageAssets,
  onMoveOverlayLayer,
  onSelectOverlay,
  overlays,
  selectedOverlayId,
}: LayersSidebarProps) {
  const pageOverlays = getPageLayerOverlays(overlays, currentPage);
  const pageOverlayIds = pageOverlays.map((overlay) => overlay.id);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const activeOverlayId = String(event.active.id);
    const overOverlayId = event.over ? String(event.over.id) : null;

    if (!overOverlayId || activeOverlayId === overOverlayId) {
      return;
    }

    const destinationIndex = pageOverlayIds.indexOf(overOverlayId);

    if (destinationIndex === -1) {
      return;
    }

    const pageOverlayIdsWithoutActive = pageOverlayIds.filter(
      (overlayId) => overlayId !== activeOverlayId,
    );
    const insertBelowOverlayId =
      destinationIndex === 0
        ? null
        : pageOverlayIdsWithoutActive[destinationIndex - 1];

    onMoveOverlayLayer({
      insertBelowOverlayId,
      overlayId: activeOverlayId,
      pageNumber: currentPage,
    });
  };

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
          <DndContext
            autoScroll={{ threshold: { x: 0, y: 0.2 } }}
            collisionDetection={closestCenter}
            modifiers={[restrictToFirstScrollableAncestor]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={pageOverlayIds}
              strategy={verticalListSortingStrategy}
            >
              {pageOverlays.map((overlay) => (
                <SortableLayerTile
                  imageAssets={imageAssets}
                  isSelected={overlay.id === selectedOverlayId}
                  key={overlay.id}
                  onSelectOverlay={onSelectOverlay}
                  overlay={overlay}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="size-16 rounded-md border border-dashed border-sidebar-border bg-page/70 text-center text-[11px] text-muted-foreground" />
        )}
      </div>
    </aside>
  );
}

function SortableLayerTile({
  imageAssets,
  isSelected,
  onSelectOverlay,
  overlay,
}: {
  imageAssets: ImageAsset[];
  isSelected: boolean;
  onSelectOverlay: (overlayId: string) => void;
  overlay: EditorOverlay;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: overlay.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <LayerTile
      className={isDragging ? "cursor-grabbing opacity-80" : "cursor-grab"}
      imageAssets={imageAssets}
      isSelected={isSelected}
      onClick={() => onSelectOverlay(overlay.id)}
      overlay={overlay}
      ref={setNodeRef}
      sortableProps={{ ...attributes, ...listeners }}
      style={style}
    />
  );
}

export { LayersSidebar };
