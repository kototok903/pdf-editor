import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { isSortableOperation } from "@dnd-kit/react/sortable";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  getPageNumberFromPageDropId,
  overlayLayerDragType,
  pageDropType,
  pageHoverMoveDelayMs,
  sidebarDndSensors,
} from "@/features/editor/components/sidebar-dnd";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";

type LayerDragSnapshot = {
  currentPage: number;
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
};

type SidebarDragDropProviderProps = {
  children: ReactNode;
  currentPage: number;
  moveOverlayLayer: ({
    insertBelowOverlayId,
    overlayId,
    pageNumber,
  }: {
    insertBelowOverlayId?: string | null;
    overlayId: string;
    pageNumber: number;
  }) => void;
  onCurrentPageChange: (pageNumber: number) => void;
  onRequestWorkspacePageScroll: (pageNumber: number) => void;
  onStopEditingOverlay: () => void;
  overlays: EditorOverlay[];
  replaceOverlays: (
    nextOverlays: EditorOverlay[],
    nextSelectedOverlayId?: string | null,
  ) => void;
  selectedOverlayId: string | null;
};

function SidebarDragDropProvider({
  children,
  currentPage,
  moveOverlayLayer,
  onCurrentPageChange,
  onRequestWorkspacePageScroll,
  onStopEditingOverlay,
  overlays,
  replaceOverlays,
  selectedOverlayId,
}: SidebarDragDropProviderProps) {
  const layerDragSnapshotRef = useRef<LayerDragSnapshot | null>(null);
  const pageHoverMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingWorkspaceScrollPageRef = useRef<number | null>(null);
  const pendingPageHoverMoveRef = useRef<number | null>(null);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const clearPageHoverMoveTimeout = useCallback(() => {
    if (pageHoverMoveTimeoutRef.current !== null) {
      clearTimeout(pageHoverMoveTimeoutRef.current);
      pageHoverMoveTimeoutRef.current = null;
    }

    pendingPageHoverMoveRef.current = null;
  }, []);

  const moveDraggedOverlayToPage = useCallback(
    (overlayId: string, pageNumber: number) => {
      moveOverlayLayer({ overlayId, pageNumber });
      currentPageRef.current = pageNumber;
      onCurrentPageChange(pageNumber);
      onStopEditingOverlay();
      pendingWorkspaceScrollPageRef.current = pageNumber;
    },
    [moveOverlayLayer, onCurrentPageChange, onStopEditingOverlay],
  );

  const scheduleDraggedOverlayPageMove = useCallback(
    (overlayId: string, pageNumber: number) => {
      if (pageNumber === currentPageRef.current) {
        clearPageHoverMoveTimeout();
        return;
      }

      if (pendingPageHoverMoveRef.current === pageNumber) {
        return;
      }

      clearPageHoverMoveTimeout();
      pendingPageHoverMoveRef.current = pageNumber;
      pageHoverMoveTimeoutRef.current = setTimeout(() => {
        moveDraggedOverlayToPage(overlayId, pageNumber);
        pageHoverMoveTimeoutRef.current = null;
        pendingPageHoverMoveRef.current = null;
      }, pageHoverMoveDelayMs);
    },
    [clearPageHoverMoveTimeout, moveDraggedOverlayToPage],
  );

  useEffect(() => {
    return () => {
      clearPageHoverMoveTimeout();
    };
  }, [clearPageHoverMoveTimeout]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { source } = event.operation;

      if (!source || source.type !== overlayLayerDragType) {
        return;
      }

      layerDragSnapshotRef.current = {
        currentPage,
        overlays,
        selectedOverlayId,
      };
      onStopEditingOverlay();
    },
    [currentPage, onStopEditingOverlay, overlays, selectedOverlayId],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { source, target } = event.operation;

      if (!source || source.type !== overlayLayerDragType) {
        return;
      }

      if (!target || target.type !== pageDropType) {
        clearPageHoverMoveTimeout();
        return;
      }

      const targetPageNumber =
        typeof target.data.pageNumber === "number"
          ? target.data.pageNumber
          : getPageNumberFromPageDropId(target.id);

      if (targetPageNumber === null) {
        clearPageHoverMoveTimeout();
        return;
      }

      scheduleDraggedOverlayPageMove(String(source.id), targetPageNumber);
    },
    [clearPageHoverMoveTimeout, scheduleDraggedOverlayPageMove],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      clearPageHoverMoveTimeout();

      const { source, target } = event.operation;
      const snapshot = layerDragSnapshotRef.current;
      layerDragSnapshotRef.current = null;

      if (!source || source.type !== overlayLayerDragType) {
        return;
      }

      if (event.canceled || event.operation.canceled) {
        if (snapshot) {
          replaceOverlays(snapshot.overlays, snapshot.selectedOverlayId);
          currentPageRef.current = snapshot.currentPage;
          onCurrentPageChange(snapshot.currentPage);
        }

        pendingWorkspaceScrollPageRef.current = null;
        return;
      }

      const activeOverlayId = String(source.id);

      if (target?.type === pageDropType) {
        const targetPageNumber =
          typeof target.data.pageNumber === "number"
            ? target.data.pageNumber
            : getPageNumberFromPageDropId(target.id);

        if (targetPageNumber !== null) {
          moveDraggedOverlayToPage(activeOverlayId, targetPageNumber);
        }
      } else if (isSortableOperation(event.operation)) {
        const sortableSource = event.operation.source;

        if (!sortableSource) {
          return;
        }

        const destinationIndex = sortableSource.index;
        const didMove =
          sortableSource.initialIndex !== sortableSource.index ||
          sortableSource.initialGroup !== sortableSource.group;

        if (didMove && destinationIndex !== -1) {
          const pageNumber =
            typeof sortableSource.group === "number"
              ? sortableSource.group
              : currentPage;
          const pageOverlayIds = getPageLayerOverlays(
            overlays,
            pageNumber,
          ).map((overlay) => overlay.id);
          const pageOverlayIdsWithoutActive = pageOverlayIds.filter(
            (overlayId) => overlayId !== activeOverlayId,
          );
          const insertBelowOverlayId =
            destinationIndex === 0
              ? null
              : pageOverlayIdsWithoutActive[destinationIndex - 1];

          moveOverlayLayer({
            insertBelowOverlayId,
            overlayId: activeOverlayId,
            pageNumber,
          });
        }
      }

      const pendingScrollPage = pendingWorkspaceScrollPageRef.current;
      pendingWorkspaceScrollPageRef.current = null;

      if (pendingScrollPage !== null) {
        onRequestWorkspacePageScroll(pendingScrollPage);
      }
    },
    [
      clearPageHoverMoveTimeout,
      currentPage,
      moveDraggedOverlayToPage,
      moveOverlayLayer,
      onCurrentPageChange,
      onRequestWorkspacePageScroll,
      overlays,
      replaceOverlays,
    ],
  );

  return (
    <DragDropProvider
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      sensors={sidebarDndSensors}
    >
      {children}
    </DragDropProvider>
  );
}

export { SidebarDragDropProvider };
