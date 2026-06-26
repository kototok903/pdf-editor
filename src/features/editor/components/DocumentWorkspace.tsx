import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  DocumentPage,
  EditorFormEdits,
  EditorOverlay,
  ImageAsset,
  PdfRect,
  PdfFormValue,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import {
  findCenteredPageNumber,
  shouldHandleScrollToPageRequest,
  shouldApplyCenteredPageFromScroll,
} from "@/features/editor/lib/page-scroll-utils";
import {
  getWorkspaceDragIntent,
  getWorkspaceDropAction,
  type WorkspaceDragIntent,
} from "@/features/editor/lib/workspace-drop-utils";
import { PdfDocumentView } from "@/features/pdf/components/PdfDocumentView";
import { PdfUploadEmptyState } from "@/features/pdf/components/PdfUploadEmptyState";
import type { PdfFormWidget } from "@/features/pdf/lib/pdf-form-metadata";
import type {
  LoadedPdfDocument,
  PageSize,
  PdfLoadStatus,
} from "@/features/pdf/pdf-types";

type DocumentWorkspaceProps = {
  activeImageAsset: ImageAsset | null;
  activeSignatureAsset: ImageAsset | null;
  currentPage: number;
  document: LoadedPdfDocument | null;
  documentPages: DocumentPage[];
  editingOverlayId: string | null;
  error: string | null;
  formEdits: EditorFormEdits;
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  missingProjectId: string | null;
  isSignatureToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
  onCancelActiveTool: () => void;
  onClearSelection: () => void;
  onCommitFormValue: (value: PdfFormValue) => void;
  onCurrentPageChange: (pageNumber: number) => void;
  onDropImageFile: (file: File) => void;
  onDropPdfFile: (file: File) => void;
  onEditOverlay: (overlayId: string | null) => void;
  onFormWidgetsChange: (pageId: string, widgets: PdfFormWidget[]) => void;
  onOpenFile: () => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceSignatureOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceWhiteoutOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  onUpdateOverlayRotation: (overlayId: string, rotationDegrees: number) => void;
  overlaysByPage: ReadonlyMap<number, EditorOverlay[]>;
  pageSizes: Record<number, PageSize>;
  selectedOverlayId: string | null;
  selectedOverlayPageNumber: number | null;
  sourceDocumentsById: ReadonlyMap<string, LoadedPdfDocument>;
  status: PdfLoadStatus;
  scrollToPageRequest: ScrollToPageRequest | null;
  whiteoutColor: string;
  zoom: number;
};

type ScrollToPageRequest = {
  behavior: ScrollBehavior;
  pageNumber: number;
  requestId: number;
};

export const DocumentWorkspace = memo(function DocumentWorkspace({
  activeImageAsset,
  activeSignatureAsset,
  currentPage,
  document,
  documentPages,
  editingOverlayId,
  error,
  formEdits,
  imageAssetById,
  isImageToolActive,
  isMarkToolActive,
  missingProjectId,
  isSignatureToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
  onCancelActiveTool,
  onClearSelection,
  onCommitFormValue,
  onCurrentPageChange,
  onDropImageFile,
  onDropPdfFile,
  onEditOverlay,
  onFormWidgetsChange,
  onOpenFile,
  onPageSizeChange,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceSignatureOverlay,
  onPlaceTextOverlay,
  onPlaceWhiteoutOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  onUpdateOverlayRotation,
  overlaysByPage,
  pageSizes,
  selectedOverlayId,
  selectedOverlayPageNumber,
  sourceDocumentsById,
  status,
  scrollToPageRequest,
  whiteoutColor,
  zoom,
}: DocumentWorkspaceProps) {
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const dragDepthRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const programmaticScrollTargetPageRef = useRef<number | null>(null);
  const programmaticScrollEndTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const handledScrollToPageRequestIdRef = useRef<number | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [dragIntent, setDragIntent] = useState<WorkspaceDragIntent>(null);
  const [scrollTargetPageElementVersion, setScrollTargetPageElementVersion] =
    useState(0);
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

    if (
      shouldApplyCenteredPageFromScroll({
        centeredPage,
        currentPage,
        programmaticScrollTargetPage: programmaticScrollTargetPageRef.current,
      })
    ) {
      onCurrentPageChange(centeredPage);
    }
  }, [currentPage, onCurrentPageChange]);

  const queueCenteredPageReport = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      return;
    }

    scrollFrameRef.current = requestAnimationFrame(reportCenteredPage);
  }, [reportCenteredPage]);

  const clearProgrammaticScrollEndTimeout = useCallback(() => {
    if (programmaticScrollEndTimeoutRef.current !== null) {
      clearTimeout(programmaticScrollEndTimeoutRef.current);
      programmaticScrollEndTimeoutRef.current = null;
    }
  }, []);

  const endProgrammaticPageScroll = useCallback(() => {
    clearProgrammaticScrollEndTimeout();

    if (programmaticScrollTargetPageRef.current === null) {
      return;
    }

    programmaticScrollTargetPageRef.current = null;
    queueCenteredPageReport();
  }, [clearProgrammaticScrollEndTimeout, queueCenteredPageReport]);

  const scheduleProgrammaticScrollEnd = useCallback(() => {
    clearProgrammaticScrollEndTimeout();
    programmaticScrollEndTimeoutRef.current = setTimeout(
      endProgrammaticPageScroll,
      programmaticScrollEndDelayMs,
    );
  }, [clearProgrammaticScrollEndTimeout, endProgrammaticPageScroll]);

  const handleManualScrollInterruption = useCallback(() => {
    endProgrammaticPageScroll();
  }, [endProgrammaticPageScroll]);

  const handleScroll = useCallback(() => {
    if (programmaticScrollTargetPageRef.current !== null) {
      scheduleProgrammaticScrollEnd();
      return;
    }

    queueCenteredPageReport();
  }, [queueCenteredPageReport, scheduleProgrammaticScrollEnd]);

  const handlePageElementChange = useCallback(
    (pageNumber: number, element: HTMLElement | null) => {
      if (element) {
        pageElementsRef.current.set(pageNumber, element);

        if (scrollToPageRequest?.pageNumber === pageNumber) {
          setScrollTargetPageElementVersion((version) => version + 1);
        }

        return;
      }

      pageElementsRef.current.delete(pageNumber);
    },
    [scrollToPageRequest],
  );

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }

      clearProgrammaticScrollEndTimeout();
    };
  }, [clearProgrammaticScrollEndTimeout]);

  useEffect(() => {
    const workspace = workspaceRef.current;

    if (!workspace) {
      return;
    }

    workspace.addEventListener("scrollend", endProgrammaticPageScroll);

    return () => {
      workspace.removeEventListener("scrollend", endProgrammaticPageScroll);
    };
  }, [endProgrammaticPageScroll]);

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

    if (
      !shouldHandleScrollToPageRequest({
        handledRequestId: handledScrollToPageRequestIdRef.current,
        hasPageElement: true,
        hasWorkspace: true,
        requestId: scrollToPageRequest.requestId,
      })
    ) {
      return;
    }

    handledScrollToPageRequestIdRef.current = scrollToPageRequest.requestId;
    programmaticScrollTargetPageRef.current = scrollToPageRequest.pageNumber;

    pageElement.scrollIntoView({
      behavior: scrollToPageRequest.behavior,
      block: "start",
      inline: "nearest",
    });

    if (scrollToPageRequest.behavior === "auto") {
      endProgrammaticPageScroll();
      return;
    }

    scheduleProgrammaticScrollEnd();
  }, [
    endProgrammaticPageScroll,
    scheduleProgrammaticScrollEnd,
    scrollTargetPageElementVersion,
    scrollToPageRequest,
  ]);

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
      onPointerDown={handleManualScrollInterruption}
      onScroll={handleScroll}
      onWheel={handleManualScrollInterruption}
      ref={workspaceRef}
      style={{ scrollPaddingTop: pageScrollTopSpacing }}
    >
      {status === "empty" && missingProjectId && (
        <PdfUploadEmptyState
          description="That project is not open in this browser. Choose a PDF to start a project."
          isPdfDropActive={dragIntent === "pdf"}
          onOpenFile={onOpenFile}
          title="Project not found"
        />
      )}

      {status === "empty" && !missingProjectId && (
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
          activeSignatureAsset={activeSignatureAsset}
          currentPage={currentPage}
          document={document}
          documentPages={documentPages}
          editingOverlayId={editingOverlayId}
          formEdits={formEdits}
          imageAssetById={imageAssetById}
          isImageToolActive={isImageToolActive}
          isMarkToolActive={isMarkToolActive}
          isSignatureToolActive={isSignatureToolActive}
          isTextToolActive={isTextToolActive}
          isWhiteoutToolActive={isWhiteoutToolActive}
          onCancelActiveTool={onCancelActiveTool}
          onClearSelection={onClearSelection}
          onCommitFormValue={onCommitFormValue}
          onEditOverlay={onEditOverlay}
          onFormWidgetsChange={onFormWidgetsChange}
          onPageElementChange={handlePageElementChange}
          onPageSizeChange={onPageSizeChange}
          onPlaceImageOverlay={onPlaceImageOverlay}
          onPlaceMarkOverlay={onPlaceMarkOverlay}
          onPlaceSignatureOverlay={onPlaceSignatureOverlay}
          onPlaceTextOverlay={onPlaceTextOverlay}
          onPlaceWhiteoutOverlay={onPlaceWhiteoutOverlay}
          onSelectOverlay={onSelectOverlay}
          onUpdateTextOverlay={onUpdateTextOverlay}
          onUpdateOverlayRect={onUpdateOverlayRect}
          onUpdateOverlayRotation={onUpdateOverlayRotation}
          overlaysByPage={overlaysByPage}
          pageSizes={pageSizes}
          scale={zoom}
          selectedOverlayId={selectedOverlayId}
          selectedOverlayPageNumber={selectedOverlayPageNumber}
          sourceDocumentsById={sourceDocumentsById}
          whiteoutColor={whiteoutColor}
        />
      )}
    </section>
  );
});

DocumentWorkspace.displayName = "DocumentWorkspace";

const pageScrollTopSpacing = 24;
const programmaticScrollEndDelayMs = 120;

function PdfPageSkeleton() {
  return (
    <div className="space-y-7">
      <Skeleton className="mx-auto h-200 w-150 shadow-page" />
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
    <div className="mx-auto flex min-h-90 w-full max-w-lg flex-col items-center justify-center rounded-lg border bg-toolbar/70 px-8 text-center">
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
