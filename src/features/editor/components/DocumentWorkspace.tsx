import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  EditorOverlay,
  ImageAsset,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import {
  findCenteredPageNumber,
  getScrollTopForPage,
} from "@/features/editor/lib/page-scroll-utils";
import {
  getWorkspaceDragIntent,
  getWorkspaceDropAction,
  type WorkspaceDragIntent,
} from "@/features/editor/lib/workspace-drop-utils";
import { PdfDocumentView } from "@/features/pdf/components/PdfDocumentView";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import { PdfUploadEmptyState } from "@/features/pdf/components/PdfUploadEmptyState";
import type {
  LoadedPdfDocument,
  PdfLoadStatus,
} from "@/features/pdf/pdf-types";

type DocumentWorkspaceProps = {
  activeImageAsset: ImageAsset | null;
  currentPage: number;
  document: LoadedPdfDocument | null;
  editingOverlayId: string | null;
  error: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isTextToolActive: boolean;
  onClearSelection: () => void;
  onCurrentPageChange: (pageNumber: number) => void;
  onDropImageFile: (file: File) => void;
  onDropPdfFile: (file: File) => void;
  onEditOverlay: (overlayId: string | null) => void;
  onOpenFile: () => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
  status: PdfLoadStatus;
  scrollToPageRequest: ScrollToPageRequest | null;
  zoom: number;
};

type ScrollToPageRequest = {
  pageNumber: number;
  requestId: number;
};

function DocumentWorkspace({
  activeImageAsset,
  currentPage,
  document,
  editingOverlayId,
  error,
  imageAssets,
  isImageToolActive,
  isMarkToolActive,
  isTextToolActive,
  onClearSelection,
  onCurrentPageChange,
  onDropImageFile,
  onDropPdfFile,
  onEditOverlay,
  onOpenFile,
  onPageSizeChange,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceTextOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  overlays,
  selectedOverlayId,
  status,
  scrollToPageRequest,
  zoom,
}: DocumentWorkspaceProps) {
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const dragDepthRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [dragIntent, setDragIntent] = useState<WorkspaceDragIntent>(null);
  const hasDocument = status === "loaded" && Boolean(document);

  const reportCenteredPage = useCallback(() => {
    scrollFrameRef.current = null;

    const workspace = workspaceRef.current;

    if (!workspace) {
      return;
    }

    const workspaceBounds = workspace.getBoundingClientRect();
    const centeredPage = findCenteredPageNumber({
      fallbackPage: currentPage,
      pages: Array.from(pageElementsRef.current, ([pageNumber, element]) => {
        const bounds = element.getBoundingClientRect();

        return {
          bottom: bounds.bottom,
          pageNumber,
          top: bounds.top,
        };
      }),
      viewportHeight: workspaceBounds.height,
      viewportTop: workspaceBounds.top,
    });

    if (centeredPage !== currentPage) {
      onCurrentPageChange(centeredPage);
    }
  }, [currentPage, onCurrentPageChange]);

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      return;
    }

    scrollFrameRef.current = requestAnimationFrame(reportCenteredPage);
  }, [reportCenteredPage]);

  const handlePageElementChange = useCallback(
    (pageNumber: number, element: HTMLElement | null) => {
      if (element) {
        pageElementsRef.current.set(pageNumber, element);
        return;
      }

      pageElementsRef.current.delete(pageNumber);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scrollToPageRequest) {
      return;
    }

    const workspace = workspaceRef.current;
    const pageElement = pageElementsRef.current.get(
      scrollToPageRequest.pageNumber,
    );

    if (!workspace || !pageElement) {
      return;
    }

    const workspaceBounds = workspace.getBoundingClientRect();
    const pageBounds = pageElement.getBoundingClientRect();

    workspace.scrollTo({
      behavior: "smooth",
      top: getScrollTopForPage({
        containerScrollTop: workspace.scrollTop,
        containerTop: workspaceBounds.top,
        pageTop: pageBounds.top,
        topSpacing: pageScrollTopSpacing,
      }),
    });
  }, [scrollToPageRequest]);

  const resetDragState = useCallback(() => {
    dragDepthRef.current = 0;
    setDragIntent(null);
  }, []);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const intent = getWorkspaceDragIntent(event.dataTransfer, {
        hasDocument,
      });

      if (!intent) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current += 1;
      setDragIntent(intent);
    },
    [hasDocument],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const intent =
        dragIntent ??
        getWorkspaceDragIntent(event.dataTransfer, {
          hasDocument,
        });

      if (!intent) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setDragIntent(intent);
    },
    [dragIntent, hasDocument],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (dragDepthRef.current === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current -= 1;

    if (dragDepthRef.current === 0) {
      setDragIntent(null);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const action = getWorkspaceDropAction(
        Array.from(event.dataTransfer.files),
        {
          hasDocument,
        },
      );

      resetDragState();

      if (!action) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (action.type === "pdf") {
        onDropPdfFile(action.file);
      } else {
        onDropImageFile(action.file);
      }
    },
    [hasDocument, onDropImageFile, onDropPdfFile, resetDragState],
  );

  return (
    <section
      className="min-h-0 flex-1 overflow-auto p-7"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onScroll={handleScroll}
      ref={workspaceRef}
    >
      {status === "empty" && (
        <PdfUploadEmptyState
          isPdfDropActive={dragIntent === "pdf"}
          onOpenFile={onOpenFile}
        />
      )}

      {status === "loading" && <PdfPageSkeleton />}

      {status === "error" && (
        <WorkspaceMessage
          title="Unable to open PDF"
          description={error ?? "Please try another PDF file."}
          actionLabel="Choose another PDF"
          onAction={onOpenFile}
        />
      )}

      {status === "loaded" && document && (
        <PdfDocumentView
          activeImageAsset={activeImageAsset}
          document={document}
          editingOverlayId={editingOverlayId}
          imageAssets={imageAssets}
          isImageToolActive={isImageToolActive}
          isMarkToolActive={isMarkToolActive}
          isTextToolActive={isTextToolActive}
          onClearSelection={onClearSelection}
          onEditOverlay={onEditOverlay}
          onPageElementChange={handlePageElementChange}
          onPageSizeChange={onPageSizeChange}
          onPlaceImageOverlay={onPlaceImageOverlay}
          onPlaceMarkOverlay={onPlaceMarkOverlay}
          onPlaceTextOverlay={onPlaceTextOverlay}
          onSelectOverlay={onSelectOverlay}
          onUpdateTextOverlay={onUpdateTextOverlay}
          onUpdateOverlayRect={onUpdateOverlayRect}
          overlays={overlays}
          scale={zoom}
          selectedOverlayId={selectedOverlayId}
        />
      )}
    </section>
  );
}

const pageScrollTopSpacing = 24;

function PdfPageSkeleton() {
  return (
    <div className="space-y-7">
      <Skeleton className="mx-auto h-[800px] w-[600px] shadow-page" />
    </div>
  );
}

function WorkspaceMessage({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="mx-auto flex min-h-[360px] w-full max-w-lg flex-col items-center justify-center rounded-lg border bg-toolbar/70 px-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export { DocumentWorkspace };
