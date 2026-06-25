import { memo } from "react";

import { PdfPageView } from "@/features/pdf/components/PdfPageView";
import type {
  DocumentPage,
  EditorFormEdits,
  EditorOverlay,
  ImageAsset,
  PdfRect,
  PdfFormValue,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import type { PdfFormWidget } from "@/features/pdf/lib/pdf-form-metadata";
import { isPageInRenderWindow } from "@/features/pdf/lib/pdf-page-size-utils";
import type { LoadedPdfDocument, PageSize } from "@/features/pdf/pdf-types";

type PdfDocumentViewProps = {
  activeImageAsset: ImageAsset | null;
  activeSignatureAsset: ImageAsset | null;
  currentPage: number;
  document: LoadedPdfDocument;
  documentPages: DocumentPage[];
  editingOverlayId: string | null;
  formEdits: EditorFormEdits;
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isSignatureToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
  onCancelActiveTool: () => void;
  onClearSelection: () => void;
  onCommitFormValue: (value: PdfFormValue) => void;
  onEditOverlay: (overlayId: string | null) => void;
  onFormWidgetsChange: (pageNumber: number, widgets: PdfFormWidget[]) => void;
  onPageElementChange: (
    pageNumber: number,
    element: HTMLElement | null,
  ) => void;
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
  scale: number;
  selectedOverlayId: string | null;
  selectedOverlayPageNumber: number | null;
  whiteoutColor: string;
};

const PdfDocumentView = memo(function PdfDocumentView({
  activeImageAsset,
  activeSignatureAsset,
  currentPage,
  document,
  documentPages,
  editingOverlayId,
  formEdits,
  imageAssetById,
  isImageToolActive,
  isMarkToolActive,
  isSignatureToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
  onCancelActiveTool,
  onClearSelection,
  onCommitFormValue,
  onEditOverlay,
  onFormWidgetsChange,
  onPageElementChange,
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
  scale,
  selectedOverlayId,
  selectedOverlayPageNumber,
  whiteoutColor,
}: PdfDocumentViewProps) {
  return (
    <div className="space-y-7">
      {Array.from({ length: document.pageCount }, (_, index) => (
        <PdfPageView
          activeImageAsset={activeImageAsset}
          activeSignatureAsset={activeSignatureAsset}
          editingOverlayId={editingOverlayId}
          formEdits={formEdits}
          imageAssetById={imageAssetById}
          isImageToolActive={isImageToolActive}
          isMarkToolActive={isMarkToolActive}
          isSignatureToolActive={isSignatureToolActive}
          isTextToolActive={isTextToolActive}
          isWhiteoutToolActive={isWhiteoutToolActive}
          key={index + 1}
          onCancelActiveTool={onCancelActiveTool}
          onClearSelection={onClearSelection}
          onCommitFormValue={onCommitFormValue}
          onEditOverlay={onEditOverlay}
          onFormWidgetsChange={onFormWidgetsChange}
          onPageElementChange={onPageElementChange}
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
          pageOverlays={overlaysByPage.get(index + 1) ?? emptyPageOverlays}
          pageId={documentPages[index]?.id ?? String(index + 1)}
          pageSize={pageSizes[index + 1] ?? getDefaultPageSize(scale)}
          pageNumber={index + 1}
          pdfDocument={document.pdfDocument}
          scale={scale}
          selectedOverlayId={
            selectedOverlayPageNumber === index + 1 ? selectedOverlayId : null
          }
          shouldRender={isPageInRenderWindow({
            currentPage,
            overscan: workspacePageRenderOverscan,
            pageNumber: index + 1,
          })}
          whiteoutColor={whiteoutColor}
        />
      ))}
    </div>
  );
});

PdfDocumentView.displayName = "PdfDocumentView";

const workspacePageRenderOverscan = 5;
const defaultPageWidth = 612;
const defaultPageHeight = 792;
const emptyPageOverlays: EditorOverlay[] = [];

function getDefaultPageSize(scale: number): PageSize {
  return {
    height: defaultPageHeight * scale,
    width: defaultPageWidth * scale,
  };
}

export { PdfDocumentView };
