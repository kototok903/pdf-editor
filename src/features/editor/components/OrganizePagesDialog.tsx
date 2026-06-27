import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import {
  ArrowRightIcon,
  CopyIcon,
  FileDownIcon,
  FilePlus2Icon,
  MoveIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Trash2Icon,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { PageThumbnailButton } from "@/features/editor/components/PageThumbnailButton";
import { sidebarDndSensors } from "@/features/editor/components/sidebar-dnd";
import type {
  DocumentPage,
  DocumentPageId,
  DocumentSource,
  EditorFormEdits,
  EditorOverlay,
  ImageAsset,
} from "@/features/editor/editor-types";
import {
  formatPageIdsAsVisibleRanges,
  parsePageRanges,
  parseVisiblePageRangesToPageIds,
  toggleAllDocumentPageIds,
} from "@/features/editor/lib/document-page-ranges";
import {
  dropFormValuesForMissingPageIds,
  dropOverlaysForMissingPageIds,
  duplicateFormValuesForPageIds,
  duplicateOverlaysForPageIds,
} from "@/features/editor/lib/document-page-remap";
import { getDocumentPageChangeSummary } from "@/features/editor/lib/document-page-summary";
import {
  deleteDocumentPages,
  type DocumentPageInsertTarget,
  duplicateDocumentPages,
  getDocumentPageInsertIndex,
  mergeDocumentSourcePages,
  moveDocumentPages,
  rotateDocumentPages,
} from "@/features/editor/lib/document-page-transforms";
import { createDocumentSource } from "@/features/editor/lib/document-pages";
import { usePdfSourceDocuments } from "@/features/pdf/hooks/usePdfDocument";
import { loadPdfDocument } from "@/features/pdf/lib/pdfjs";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

export type OrganizePagesDialogSaveInput = {
  documentPages: DocumentPage[];
  documentSources: DocumentSource[];
  formEdits: EditorFormEdits;
  overlays: EditorOverlay[];
};

export type OrganizePagesDialogExportInput = OrganizePagesDialogSaveInput & {
  selectedPageIds: DocumentPageId[];
  selectedRangesLabel: string;
};

type OrganizePagesDialogProps = {
  document: LoadedPdfDocument | null;
  documentPages: DocumentPage[];
  documentSources: DocumentSource[];
  formEdits: EditorFormEdits;
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isExporting: boolean;
  onExportSelectedPages: (input: OrganizePagesDialogExportInput) => void;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (input: OrganizePagesDialogSaveInput) => void;
  open: boolean;
  overlays: EditorOverlay[];
};

type InsertMode = "after" | "before" | "beginning" | "end";

const emptyPageOverlays: EditorOverlay[] = [];
const organizerPageDragType = "organizer-page";
const organizerPageDragGroup = "organizer-pages";

export function OrganizePagesDialog({
  document,
  documentPages,
  documentSources,
  formEdits,
  imageAssetById,
  isExporting,
  onExportSelectedPages,
  onOpenChange,
  onSave,
  open,
  overlays,
}: OrganizePagesDialogProps) {
  const [draftPages, setDraftPages] = useState<DocumentPage[]>(documentPages);
  const [draftSources, setDraftSources] =
    useState<DocumentSource[]>(documentSources);
  const [draftOverlays, setDraftOverlays] = useState<EditorOverlay[]>(overlays);
  const [draftFormEdits, setDraftFormEdits] =
    useState<EditorFormEdits>(formEdits);
  const [selectedPageIds, setSelectedPageIds] = useState<DocumentPageId[]>([]);
  const [rangeInput, setRangeInput] = useState("");
  const [isRangeDirty, setIsRangeDirty] = useState(false);
  const [lastSelectedPageId, setLastSelectedPageId] =
    useState<DocumentPageId | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const sourceDocumentsById = usePdfSourceDocuments(draftSources, document);
  const selectedPageIdSet = useMemo(
    () => new Set(selectedPageIds),
    [selectedPageIds],
  );
  const allPagesSelected =
    draftPages.length > 0 && selectedPageIdSet.size === draftPages.length;
  const selectedRangesLabel = formatPageIdsAsVisibleRanges(
    draftPages,
    selectedPageIds,
  );
  const rangeParseResult = useMemo(
    () =>
      parseVisiblePageRangesToPageIds(
        isRangeDirty ? rangeInput : selectedRangesLabel,
        draftPages,
      ),
    [draftPages, isRangeDirty, rangeInput, selectedRangesLabel],
  );
  const draftOverlaysByPageId = useMemo(
    () => groupOverlaysByPageId(draftOverlays),
    [draftOverlays],
  );
  const summary = useMemo(
    () => getDocumentPageChangeSummary(documentPages, draftPages),
    [documentPages, draftPages],
  );
  const canDelete =
    selectedPageIds.length > 0 && selectedPageIds.length < draftPages.length;
  const canMove =
    selectedPageIds.length > 0 && selectedPageIds.length < draftPages.length;

  const dialogDescriptionClauses = [];
  if (summary.addedPages > 0)
    dialogDescriptionClauses.push(`${summary.addedPages} added`);
  if (summary.editedPages > 0)
    dialogDescriptionClauses.push(`${summary.editedPages} edited`);
  if (summary.deletedPages > 0)
    dialogDescriptionClauses.push(`${summary.deletedPages} deleted`);
  const dialogDescription = `${draftPages.length} pages · ${dialogDescriptionClauses.join(", ") || "no edits"}`;

  const applyRangeInput = useCallback(() => {
    if (!rangeParseResult.ok) {
      return;
    }

    setSelectedPageIds(rangeParseResult.pageIds);
    setLastSelectedPageId(rangeParseResult.pageIds.at(-1) ?? null);
    setIsRangeDirty(false);
  }, [rangeParseResult]);

  const resetDraft = useCallback(() => {
    setDraftPages(documentPages);
    setDraftSources(documentSources);
    setDraftOverlays(overlays);
    setDraftFormEdits(formEdits);
    setSelectedPageIds([]);
    setRangeInput("");
    setIsRangeDirty(false);
    setLastSelectedPageId(null);
  }, [documentPages, documentSources, formEdits, overlays]);

  const selectPage = useCallback(
    (pageId: DocumentPageId, isShiftPressed: boolean) => {
      setIsRangeDirty(false);
      setSelectedPageIds((currentPageIds) => {
        if (!isShiftPressed || !lastSelectedPageId) {
          setLastSelectedPageId(pageId);
          return currentPageIds.includes(pageId)
            ? currentPageIds.filter((currentPageId) => currentPageId !== pageId)
            : [...currentPageIds, pageId];
        }

        const anchorIndex = draftPages.findIndex(
          (page) => page.id === lastSelectedPageId,
        );
        const targetIndex = draftPages.findIndex((page) => page.id === pageId);

        if (anchorIndex === -1 || targetIndex === -1) {
          return currentPageIds;
        }

        const startIndex = Math.min(anchorIndex, targetIndex);
        const endIndex = Math.max(anchorIndex, targetIndex);
        const rangePageIds = draftPages
          .slice(startIndex, endIndex + 1)
          .map((page) => page.id);

        return [...new Set([...currentPageIds, ...rangePageIds])];
      });
    },
    [draftPages, lastSelectedPageId],
  );

  const applyDelete = useCallback(() => {
    if (!canDelete) {
      return;
    }

    const nextPages = deleteDocumentPages(draftPages, selectedPageIds);
    const remainingPageIds = nextPages.map((page) => page.id);

    setDraftPages(nextPages);
    setDraftOverlays((currentOverlays) =>
      dropOverlaysForMissingPageIds(currentOverlays, remainingPageIds),
    );
    setDraftFormEdits((currentFormEdits) =>
      dropFormValuesForMissingPageIds(currentFormEdits, remainingPageIds),
    );
    setSelectedPageIds([]);
    setIsRangeDirty(false);
    setLastSelectedPageId(null);
  }, [canDelete, draftPages, selectedPageIds]);

  const applyDuplicate = useCallback(() => {
    const result = duplicateDocumentPages(draftPages, selectedPageIds);

    setDraftPages(result.documentPages);
    setDraftOverlays((currentOverlays) => [
      ...currentOverlays,
      ...duplicateOverlaysForPageIds(
        currentOverlays,
        result.duplicatedPageIdMap,
      ),
    ]);
    setDraftFormEdits((currentFormEdits) => ({
      values: [
        ...currentFormEdits.values,
        ...duplicateFormValuesForPageIds(
          currentFormEdits,
          result.duplicatedPageIdMap,
        ).values,
      ],
    }));
    setSelectedPageIds([...result.duplicatedPageIdMap.values()]);
    setIsRangeDirty(false);
  }, [draftPages, selectedPageIds]);

  const applyRotate = useCallback(
    (rotationDeltaDegrees: number) => {
      setDraftPages((currentPages) =>
        rotateDocumentPages(
          currentPages,
          selectedPageIds,
          rotationDeltaDegrees,
        ),
      );
    },
    [selectedPageIds],
  );

  const moveSelectedPages = useCallback(
    (target: DocumentPageInsertTarget) => {
      const insertIndexResult = getDocumentPageInsertIndex(draftPages, target);

      if (!insertIndexResult.ok) {
        return false;
      }

      setDraftPages((currentPages) =>
        moveDocumentPages(
          currentPages,
          selectedPageIds,
          insertIndexResult.insertIndex,
        ),
      );
      setIsRangeDirty(false);
      return true;
    },
    [draftPages, selectedPageIds],
  );

  const mergeDocument = useCallback(
    (input: {
      file: File;
      insertTarget: DocumentPageInsertTarget;
      sourcePageRanges: string;
    }) => {
      return mergeDocumentIntoDraft({
        draftPages,
        file: input.file,
        insertTarget: input.insertTarget,
        setDraftPages,
        setDraftSources,
        setSelectedPageIds,
        sourcePageRanges: input.sourcePageRanges,
      });
    },
    [draftPages],
  );

  const handlePageDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { source } = event.operation;

      if (
        event.canceled ||
        event.operation.canceled ||
        !source ||
        source.type !== organizerPageDragType ||
        !isSortableOperation(event.operation)
      ) {
        return;
      }

      const sortableSource = event.operation.source;

      if (!sortableSource) {
        return;
      }

      const activePageId = String(source.id);
      const movingPageIds = selectedPageIdSet.has(activePageId)
        ? selectedPageIds
        : [activePageId];
      const didMove =
        sortableSource.initialIndex !== sortableSource.index ||
        sortableSource.initialGroup !== sortableSource.group;

      if (!didMove || sortableSource.index === -1) {
        return;
      }

      setDraftPages((currentPages) =>
        moveDocumentPagesToSortableIndex(
          currentPages,
          movingPageIds,
          sortableSource.index,
        ),
      );
      setIsRangeDirty(false);
    },
    [selectedPageIdSet, selectedPageIds],
  );

  const handleSave = useCallback(() => {
    onSave({
      documentPages: draftPages,
      documentSources: draftSources,
      formEdits: draftFormEdits,
      overlays: draftOverlays,
    });
    onOpenChange(false);
  }, [
    draftFormEdits,
    draftOverlays,
    draftPages,
    draftSources,
    onOpenChange,
    onSave,
  ]);

  const handleExportSelectedPages = useCallback(() => {
    onExportSelectedPages({
      documentPages: draftPages,
      documentSources: draftSources,
      formEdits: draftFormEdits,
      overlays: draftOverlays,
      selectedPageIds,
      selectedRangesLabel,
    });
  }, [
    draftFormEdits,
    draftOverlays,
    draftPages,
    draftSources,
    onExportSelectedPages,
    selectedPageIds,
    selectedRangesLabel,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(92vh,820px)] w-[min(96vw,1180px)] max-w-[min(96vw,1180px)] grid-rows-[auto_1fr_auto] gap-0 sm:max-w-[min(96vw,1180px)]">
        <DialogHeader separated>
          <DialogTitle>Organize pages</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="-mx-4 grid min-h-0 grid-cols-[minmax(0,1fr)_200px] max-md:grid-cols-1">
          <div className="min-h-0 overflow-auto p-4">
            <DragDropProvider
              onDragEnd={handlePageDragEnd}
              sensors={sidebarDndSensors}
            >
              <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] items-center gap-4">
                {draftPages.map((page, index) => {
                  const pageNumber = index + 1;
                  const sourceDocument = sourceDocumentsById.get(page.sourceId);

                  return (
                    sourceDocument && (
                      <SortableOrganizerPage
                        imageAssetById={imageAssetById}
                        index={index}
                        isSelected={selectedPageIdSet.has(page.id)}
                        key={page.id}
                        onSelectPage={selectPage}
                        page={page}
                        pageNumber={pageNumber}
                        pageOverlays={
                          draftOverlaysByPageId.get(page.id) ??
                          emptyPageOverlays
                        }
                        pdfDocument={sourceDocument.pdfDocument}
                      />
                    )
                  );
                })}
              </div>
            </DragDropProvider>
          </div>
          <aside className="flex min-h-0 flex-col gap-4 border-l p-4 max-md:border-t max-md:border-l-0">
            <section className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Select
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allPagesSelected}
                  onCheckedChange={() => {
                    setSelectedPageIds(
                      toggleAllDocumentPageIds(draftPages, selectedPageIds),
                    );
                    setIsRangeDirty(false);
                    setLastSelectedPageId(null);
                  }}
                />
                {selectedPageIds.length} selected
              </label>
              <div className="flex">
                <Input
                  aria-invalid={isRangeDirty && !rangeParseResult.ok}
                  className="data-[dirty=true]:rounded-r-none"
                  data-dirty={isRangeDirty}
                  onChange={(event) => {
                    setRangeInput(event.target.value);
                    setIsRangeDirty(true);
                  }}
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === "Enter") {
                      applyRangeInput();
                    } else if (event.key === "Escape") {
                      setRangeInput(selectedRangesLabel);
                      setIsRangeDirty(false);
                    }
                  }}
                  placeholder="e.g., 2-3, 5, 11-13"
                  value={isRangeDirty ? rangeInput : selectedRangesLabel}
                />
                {isRangeDirty && (
                  <Button
                    className="size-8 p-0 -ml-px data-[dirty=true]:rounded-l-none"
                    data-dirty={isRangeDirty}
                    disabled={!rangeParseResult.ok}
                    onClick={applyRangeInput}
                    type="button"
                    variant="outline"
                  >
                    <ArrowRightIcon aria-hidden="true" />
                  </Button>
                )}
              </div>
              {isRangeDirty && !rangeParseResult.ok && (
                <div className="text-xs text-destructive">
                  {rangeParseResult.error}
                </div>
              )}
            </section>
            <section className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  disabled={selectedPageIds.length === 0}
                  label="Rotate left"
                  onClick={() => applyRotate(-90)}
                  tooltip
                >
                  <RotateCcwIcon aria-hidden="true" />
                </ActionButton>
                <ActionButton
                  disabled={selectedPageIds.length === 0}
                  label="Rotate right"
                  onClick={() => applyRotate(90)}
                  tooltip
                >
                  <RotateCwIcon aria-hidden="true" />
                </ActionButton>
                <ActionButton
                  disabled={selectedPageIds.length === 0}
                  label="Duplicate"
                  onClick={applyDuplicate}
                  tooltip
                >
                  <CopyIcon aria-hidden="true" />
                </ActionButton>
                <ActionButton
                  disabled={!canDelete}
                  label="Delete"
                  onClick={applyDelete}
                  tooltip
                >
                  <Trash2Icon aria-hidden="true" />
                </ActionButton>
              </div>
              <ActionButton
                disabled={!canMove}
                label="Move"
                onClick={() => setIsMoveDialogOpen(true)}
              >
                <MoveIcon aria-hidden="true" />
                Move
              </ActionButton>
              <ActionButton
                disabled={selectedPageIds.length === 0 || isExporting}
                label="Export selected"
                onClick={handleExportSelectedPages}
                tooltip
                tooltipSide="left"
              >
                <FileDownIcon aria-hidden="true" />
                Export
              </ActionButton>
              <ActionButton
                label="Merge PDF"
                onClick={() => setIsMergeDialogOpen(true)}
              >
                <FilePlus2Icon aria-hidden="true" />
                Merge PDF
              </ActionButton>
            </section>
          </aside>
        </div>
        <DialogFooter>
          <Button
            className="sm:mr-auto"
            onClick={resetDraft}
            type="button"
            variant="outline"
          >
            <RotateCcwIcon aria-hidden />
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={draftPages.length === 0}
            onClick={handleSave}
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
        {isMoveDialogOpen && (
          <MovePagesDialog
            onMove={(target) => {
              const didMove = moveSelectedPages(target);

              if (didMove) {
                setIsMoveDialogOpen(false);
              }
            }}
            onOpenChange={setIsMoveDialogOpen}
            open={isMoveDialogOpen}
            pageCount={draftPages.length}
          />
        )}
        {isMergeDialogOpen && (
          <MergePagesDialog
            onMerge={async (input) => {
              const didMerge = await mergeDocument(input);

              if (didMerge) {
                setIsRangeDirty(false);
                setIsMergeDialogOpen(false);
              }

              return didMerge;
            }}
            onOpenChange={setIsMergeDialogOpen}
            open={isMergeDialogOpen}
            pageCount={draftPages.length}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SortableOrganizerPage({
  imageAssetById,
  index,
  isSelected,
  onSelectPage,
  page,
  pageNumber,
  pageOverlays,
  pdfDocument,
}: {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  index: number;
  isSelected: boolean;
  onSelectPage: (pageId: DocumentPageId, isShiftPressed: boolean) => void;
  page: DocumentPage;
  pageNumber: number;
  pageOverlays: EditorOverlay[];
  pdfDocument: LoadedPdfDocument["pdfDocument"];
}) {
  const { handleRef, isDragging, ref } = useSortable({
    accept: organizerPageDragType,
    group: organizerPageDragGroup,
    id: page.id,
    index,
    type: organizerPageDragType,
  });
  const setPageRef = useCallback(
    (element: HTMLButtonElement | null) => {
      ref(element);
      handleRef(element);
    },
    [handleRef, ref],
  );

  return (
    <PageThumbnailButton
      buttonRef={setPageRef}
      className={isDragging ? "cursor-grabbing opacity-80" : "cursor-grab"}
      imageAssetById={imageAssetById}
      isSelected={isSelected}
      onClick={(event) => {
        onSelectPage(page.id, event.shiftKey);
      }}
      pageNumber={pageNumber}
      pageOverlays={pageOverlays}
      pageRotationDegrees={page.rotationDegrees}
      pdfDocument={pdfDocument}
      shouldRenderThumbnail
      sourcePageNumber={page.sourcePageNumber}
      thumbnailWidth={128}
      cornerSlots={{
        ...(page.rotationDegrees !== 0 && { bl: `${page.rotationDegrees}°` }),
        br: pageNumber,
      }}
    />
  );
}

function moveDocumentPagesToSortableIndex(
  documentPages: readonly DocumentPage[],
  pageIds: Iterable<DocumentPageId>,
  sortableIndex: number,
) {
  const movingPageIds = new Set(pageIds);
  const movingPages = documentPages.filter((page) =>
    movingPageIds.has(page.id),
  );

  if (movingPages.length === 0) {
    return [...documentPages];
  }

  const remainingPages = documentPages.filter(
    (page) => !movingPageIds.has(page.id),
  );
  const insertIndex = Math.min(
    remainingPages.length,
    Math.max(0, Math.trunc(sortableIndex)),
  );

  return [
    ...remainingPages.slice(0, insertIndex),
    ...movingPages,
    ...remainingPages.slice(insertIndex),
  ];
}

function ActionButton({
  children,
  disabled,
  label,
  onClick,
  tooltip,
  tooltipSide = "top",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
  tooltip?: boolean;
  tooltipSide?: "top" | "left";
}) {
  return (
    <Tooltip disabled={!tooltip || disabled} tooltip={label} side={tooltipSide}>
      <Button
        aria-label={label}
        className="w-full justify-center min-h-10"
        disabled={disabled}
        onClick={onClick}
        type="button"
        variant="outline"
      >
        {children}
      </Button>
    </Tooltip>
  );
}

function MovePagesDialog({
  onMove,
  onOpenChange,
  open,
  pageCount,
}: {
  onMove: (target: DocumentPageInsertTarget) => void;
  onOpenChange: (isOpen: boolean) => void;
  open: boolean;
  pageCount: number;
}) {
  const [insertMode, setInsertMode] = useState<InsertMode>("end");
  const [pageNumberInput, setPageNumberInput] = useState("");
  const target = getInsertTarget(insertMode, pageNumberInput);
  const validation = target
    ? getDocumentPageInsertIndex(createPlaceholderPages(pageCount), target)
    : { error: "Enter a page number.", ok: false as const };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move pages</DialogTitle>
          <DialogDescription>Select where selected pages go.</DialogDescription>
        </DialogHeader>
        <InsertTargetFields
          insertMode={insertMode}
          onInsertModeChange={setInsertMode}
          onPageNumberInputChange={setPageNumberInput}
          pageNumberInput={pageNumberInput}
        />
        {!validation.ok && (
          <div className="text-xs text-destructive">{validation.error}</div>
        )}
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!target || !validation.ok}
            onClick={() => {
              if (target && validation.ok) {
                onMove(target);
              }
            }}
            type="button"
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergePagesDialog({
  onMerge,
  onOpenChange,
  open,
  pageCount,
}: {
  onMerge: (input: {
    file: File;
    insertTarget: DocumentPageInsertTarget;
    sourcePageRanges: string;
  }) => Promise<boolean>;
  onOpenChange: (isOpen: boolean) => void;
  open: boolean;
  pageCount: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [insertMode, setInsertMode] = useState<InsertMode>("end");
  const [pageNumberInput, setPageNumberInput] = useState("");
  const [sourcePageRanges, setSourcePageRanges] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const target = getInsertTarget(insertMode, pageNumberInput);
  const validation = target
    ? getDocumentPageInsertIndex(createPlaceholderPages(pageCount), target)
    : { error: "Enter a page number.", ok: false as const };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge PDF</DialogTitle>
          <DialogDescription>
            Add selected pages from another PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            PDF
            <Input
              accept="application/pdf"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFile(event.target.files?.[0] ?? null);
              }}
              type="file"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Pages
            <Input
              onChange={(event) => setSourcePageRanges(event.target.value)}
              placeholder="All pages, or 1-3, 5"
              value={sourcePageRanges}
            />
          </label>
          <InsertTargetFields
            insertMode={insertMode}
            onInsertModeChange={setInsertMode}
            onPageNumberInputChange={setPageNumberInput}
            pageNumberInput={pageNumberInput}
          />
          {!validation.ok && (
            <div className="text-xs text-destructive">{validation.error}</div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={isMerging}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!file || !target || !validation.ok || isMerging}
            onClick={() => {
              if (!file || !target || !validation.ok) {
                return;
              }

              setIsMerging(true);
              void onMerge({
                file,
                insertTarget: target,
                sourcePageRanges,
              }).finally(() => setIsMerging(false));
            }}
            type="button"
          >
            {isMerging ? "Merging..." : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InsertTargetFields({
  insertMode,
  onInsertModeChange,
  onPageNumberInputChange,
  pageNumberInput,
}: {
  insertMode: InsertMode;
  onInsertModeChange: (insertMode: InsertMode) => void;
  onPageNumberInputChange: (value: string) => void;
  pageNumberInput: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-1.5 text-sm">
        Position
        <Select
          onValueChange={(value) => onInsertModeChange(value as InsertMode)}
          value={insertMode}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="end">End</SelectItem>
            <SelectItem value="beginning">Beginning</SelectItem>
            <SelectItem value="after">After page</SelectItem>
            <SelectItem value="before">Before page</SelectItem>
          </SelectContent>
        </Select>
      </label>
      {(insertMode === "after" || insertMode === "before") && (
        <label className="grid gap-1.5 text-sm">
          Page number
          <Input
            min={1}
            onChange={(event) => onPageNumberInputChange(event.target.value)}
            type="number"
            value={pageNumberInput}
          />
        </label>
      )}
    </div>
  );
}

async function mergeDocumentIntoDraft({
  draftPages,
  file,
  insertTarget,
  setDraftPages,
  setDraftSources,
  setSelectedPageIds,
  sourcePageRanges,
}: {
  draftPages: DocumentPage[];
  file: File;
  insertTarget: DocumentPageInsertTarget;
  setDraftPages: React.Dispatch<React.SetStateAction<DocumentPage[]>>;
  setDraftSources: React.Dispatch<React.SetStateAction<DocumentSource[]>>;
  setSelectedPageIds: React.Dispatch<React.SetStateAction<DocumentPageId[]>>;
  sourcePageRanges: string;
}) {
  if (file.type && file.type !== "application/pdf") {
    toast.error("Unable to merge PDF", {
      description: "Choose a PDF file.",
    });
    return false;
  }

  try {
    const bytes = await file.arrayBuffer();
    const pdfDocument = await loadPdfDocument(bytes);
    const pageCount = pdfDocument.numPages;

    await pdfDocument.destroy();

    const rangeResult = parsePageRanges(
      sourcePageRanges.trim() ? sourcePageRanges : `1-${pageCount}`,
      pageCount,
    );

    if (!rangeResult.ok) {
      toast.error("Unable to merge PDF", {
        description: rangeResult.error,
      });
      return false;
    }

    const insertIndexResult = getDocumentPageInsertIndex(
      draftPages,
      insertTarget,
    );

    if (!insertIndexResult.ok) {
      toast.error("Unable to merge PDF", {
        description: insertIndexResult.error,
      });
      return false;
    }

    const source = createDocumentSource({
      bytes,
      fileName: file.name,
      pageCount,
    });
    const mergeResult = mergeDocumentSourcePages({
      documentPages: draftPages,
      insertIndex: insertIndexResult.insertIndex,
      source,
      sourcePageNumbers: rangeResult.pageNumbers,
    });

    setDraftSources((currentSources) => [...currentSources, source]);
    setDraftPages(mergeResult.documentPages);
    setSelectedPageIds(mergeResult.addedPageIds);
    return true;
  } catch (error) {
    toast.error("Unable to merge PDF", {
      description:
        error instanceof Error ? error.message : "The PDF could not be loaded.",
    });
    return false;
  }
}

function getInsertTarget(
  insertMode: InsertMode,
  pageNumberInput: string,
): DocumentPageInsertTarget | null {
  if (insertMode === "beginning" || insertMode === "end") {
    return { placement: insertMode };
  }

  const pageNumber = Number(pageNumberInput);

  return Number.isInteger(pageNumber)
    ? { pageNumber, placement: insertMode }
    : null;
}

function createPlaceholderPages(pageCount: number): DocumentPage[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `page-${index + 1}`,
    rotationDegrees: 0,
    sourceId: "source",
    sourcePageNumber: index + 1,
  }));
}

function groupOverlaysByPageId(overlays: EditorOverlay[]) {
  const overlaysByPageId = new Map<DocumentPageId, EditorOverlay[]>();

  for (const overlay of overlays) {
    const pageOverlays = overlaysByPageId.get(overlay.pageId);

    if (pageOverlays) {
      pageOverlays.push(overlay);
    } else {
      overlaysByPageId.set(overlay.pageId, [overlay]);
    }
  }

  return overlaysByPageId;
}
