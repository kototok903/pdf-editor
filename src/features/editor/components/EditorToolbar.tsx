import {
  Redo2Icon,
  SettingsIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { memo, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { ImageToolButton } from "@/features/editor/components/ImageToolButton";
import { ImageUrlDialog } from "@/features/editor/components/ImageUrlDialog";
import { MarkToolButton } from "@/features/editor/components/MarkToolButton";
import { ProjectDropdown } from "@/features/editor/components/ProjectDropdown";
import { SidebarsToggle } from "@/features/editor/components/SidebarsToggle";
import type { SignatureCreateInput } from "@/features/editor/components/SignatureCreateDialog";
import { SignatureToolButton } from "@/features/editor/components/SignatureToolButton";
import { TextToolButton } from "@/features/editor/components/TextToolButton";
import { WhiteoutToolButton } from "@/features/editor/components/WhiteoutToolButton";
import type {
  ImageAsset,
  MarkOverlayPatch,
  MarkType,
  TextOverlayDefaults,
  TextOverlayPatch,
  WhiteoutOverlayDefaults,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import type { Project } from "@/features/editor/lib/editor-projects";
import type { DocumentTextFontMenuOption } from "@/features/editor/lib/text-fonts";
import type { PdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";
import type { PageSize } from "@/features/pdf/pdf-types";

type EditorToolbarProps = {
  activeProjectId: string | null;
  activeProject: Project | null;
  activeImageAssetId: string | null;
  activeSignatureAssetId: string | null;
  documentFontOptions: DocumentTextFontMenuOption[];
  fileName: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isLayersSidebarOpen: boolean;
  isPagesSidebarOpen: boolean;
  isMarkSettingsDefault: boolean;
  isMarkToolActive: boolean;
  isSignatureToolActive: boolean;
  isTextSettingsDefault: boolean;
  isTextToolActive: boolean;
  isWhiteoutSettingsDefault: boolean;
  isWhiteoutToolActive: boolean;
  onImportImageFromClipboard: () => void;
  onImportImageUrl: (url: string) => Promise<void>;
  onMarkSettingsChange: (patch: MarkOverlayPatch) => void;
  onMarkSettingsReset: () => void;
  onMarkToolActivate: () => void;
  onMarkToolClick: () => void;
  onCloseActiveProject: () => void;
  onCreateSignature: (input: SignatureCreateInput) => Promise<boolean>;
  onExportPdf: () => void;
  onOpenFile: () => void;
  onOpenImageDialog: () => void;
  onOpenOrganizePages: () => void;
  onRedo: () => void;
  onRemoveImageAssetFromRecents: (assetId: string) => void;
  onRemoveSignatureAssetFromRecents: (assetId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onOpenProjectInNewTab: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectImageAsset: (assetId: string) => void;
  onSelectSignatureAsset: (assetId: string) => void;
  onTextSettingsChange: (patch: TextOverlayPatch) => void;
  onTextSettingsReset: () => void;
  onTextToolClick: () => void;
  onOpenSettings: () => void;
  onUpdateActiveProjectMetadata: (metadata: PdfProjectMetadata) => void;
  onToggleLayersSidebar: () => void;
  onTogglePagesSidebar: () => void;
  onUndo: () => void;
  onWhiteoutSettingsChange: (patch: WhiteoutOverlayPatch) => void;
  onWhiteoutSettingsReset: () => void;
  onWhiteoutToolClick: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
  pageSizes: Record<number, PageSize>;
  projects: Project[];
  signatureAssets: ImageAsset[];
  status: "empty" | "loading" | "loaded" | "error";
  canRedo: boolean;
  canUndo: boolean;
  isExporting: boolean;
  markSettings: {
    color: string;
    markType: MarkType;
  };
  canCloseProject: boolean;
  textSettings: TextOverlayDefaults;
  whiteoutSettings: WhiteoutOverlayDefaults;
  zoomPercent: number;
};

export const EditorToolbar = memo(function EditorToolbar({
  activeProjectId,
  activeProject,
  activeImageAssetId,
  activeSignatureAssetId,
  documentFontOptions,
  fileName,
  imageAssets,
  isImageToolActive,
  isLayersSidebarOpen,
  isPagesSidebarOpen,
  isMarkSettingsDefault,
  isMarkToolActive,
  isSignatureToolActive,
  isTextSettingsDefault,
  isTextToolActive,
  isWhiteoutSettingsDefault,
  isWhiteoutToolActive,
  markSettings,
  canRedo,
  canCloseProject,
  canUndo,
  onCloseActiveProject,
  onCreateSignature,
  onExportPdf,
  onImportImageFromClipboard,
  onImportImageUrl,
  onMarkSettingsChange,
  onMarkSettingsReset,
  onMarkToolActivate,
  onMarkToolClick,
  onOpenFile,
  onOpenImageDialog,
  onOpenOrganizePages,
  onRedo,
  onRemoveImageAssetFromRecents,
  onRemoveSignatureAssetFromRecents,
  onRemoveProject,
  onOpenProjectInNewTab,
  onSelectProject,
  onSelectImageAsset,
  onSelectSignatureAsset,
  onTextSettingsChange,
  onTextSettingsReset,
  onTextToolClick,
  onOpenSettings,
  onUpdateActiveProjectMetadata,
  onToggleLayersSidebar,
  onTogglePagesSidebar,
  onUndo,
  onWhiteoutSettingsChange,
  onWhiteoutSettingsReset,
  onWhiteoutToolClick,
  onZoomIn,
  onZoomOut,
  pageCount,
  pageSizes,
  projects,
  signatureAssets,
  status,
  isExporting,
  textSettings,
  whiteoutSettings,
  zoomPercent,
}: EditorToolbarProps) {
  const hasPdf = pageCount > 0;
  const isLoading = status === "loading";
  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const handleOpenImageUrlDialog = useCallback(() => {
    setIsImageUrlDialogOpen(true);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b bg-toolbar text-toolbar-foreground">
      <div className="flex h-12 items-center gap-1.5 px-2.5">
        <ProjectDropdown
          activeProject={activeProject}
          hasPdf={hasPdf}
          fileName={fileName}
          pageSizes={pageSizes}
          projects={projects}
          activeProjectId={activeProjectId}
          isExporting={isExporting}
          isLoading={isLoading}
          canCloseProject={canCloseProject}
          onExportPdf={onExportPdf}
          onOpenFile={onOpenFile}
          onOpenOrganizePages={onOpenOrganizePages}
          onCloseActiveProject={onCloseActiveProject}
          onOpenProjectInNewTab={onOpenProjectInNewTab}
          onSelectProject={onSelectProject}
          onRemoveProject={onRemoveProject}
          onUpdateActiveProjectMetadata={onUpdateActiveProjectMetadata}
        />

        <SidebarsToggle
          isPagesSidebarOpen={isPagesSidebarOpen}
          isLayersSidebarOpen={isLayersSidebarOpen}
          onTogglePagesSidebar={onTogglePagesSidebar}
          onToggleLayersSidebar={onToggleLayersSidebar}
        />

        <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

        <TextToolButton
          disabled={!hasPdf}
          documentFontOptions={documentFontOptions}
          isDefault={isTextSettingsDefault}
          isSelected={isTextToolActive}
          onSettingsChange={onTextSettingsChange}
          onSettingsReset={onTextSettingsReset}
          onTextToolClick={onTextToolClick}
          settings={textSettings}
        />

        <ImageToolButton
          activeImageAssetId={activeImageAssetId}
          disabled={!hasPdf}
          imageAssets={imageAssets}
          isSelected={isImageToolActive}
          onImportImageFromClipboard={onImportImageFromClipboard}
          onOpenUrlDialog={handleOpenImageUrlDialog}
          onRemoveImageAssetFromRecents={onRemoveImageAssetFromRecents}
          onSelectImageAsset={onSelectImageAsset}
          onUploadImage={onOpenImageDialog}
        />
        <SignatureToolButton
          activeSignatureAssetId={activeSignatureAssetId}
          disabled={!hasPdf}
          isSelected={isSignatureToolActive}
          onCreateSignature={onCreateSignature}
          onRemoveSignatureAssetFromRecents={onRemoveSignatureAssetFromRecents}
          onSelectSignatureAsset={onSelectSignatureAsset}
          signatureAssets={signatureAssets}
        />

        <MarkToolButton
          color={markSettings.color}
          disabled={!hasPdf}
          isDefault={isMarkSettingsDefault}
          isSelected={isMarkToolActive}
          markType={markSettings.markType}
          onMarkToolActivate={onMarkToolActivate}
          onMarkToolClick={onMarkToolClick}
          onSettingsChange={onMarkSettingsChange}
          onSettingsReset={onMarkSettingsReset}
        />

        <WhiteoutToolButton
          disabled={!hasPdf}
          isDefault={isWhiteoutSettingsDefault}
          isSelected={isWhiteoutToolActive}
          onSettingsChange={onWhiteoutSettingsChange}
          onSettingsReset={onWhiteoutSettingsReset}
          onWhiteoutToolClick={onWhiteoutToolClick}
          settings={whiteoutSettings}
        />

        <div className="ml-auto flex items-center gap-1">
          <Tooltip tooltip="Undo" disabled={!canUndo}>
            <Button
              className="w-7.5 px-0"
              disabled={!canUndo}
              onClick={onUndo}
              size="sm"
              type="button"
              variant="toolbar"
            >
              <Undo2Icon aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip tooltip="Redo" disabled={!canRedo}>
            <Button
              className="w-7.5 px-0"
              disabled={!canRedo}
              onClick={onRedo}
              size="sm"
              type="button"
              variant="toolbar"
            >
              <Redo2Icon aria-hidden="true" />
            </Button>
          </Tooltip>

          <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

          <Tooltip tooltip="Zoom out" disabled={!hasPdf}>
            <Button
              className="w-7.5 px-0"
              disabled={!hasPdf}
              onClick={onZoomOut}
              size="sm"
              type="button"
              variant="toolbar"
            >
              <ZoomOutIcon aria-hidden="true" />
            </Button>
          </Tooltip>
          <div className="w-11 text-center text-xs text-muted-foreground">
            {zoomPercent}%
          </div>
          <Tooltip tooltip="Zoom in" disabled={!hasPdf}>
            <Button
              className="w-7.5 px-0"
              disabled={!hasPdf}
              onClick={onZoomIn}
              size="sm"
              type="button"
              variant="toolbar"
            >
              <ZoomInIcon aria-hidden="true" />
            </Button>
          </Tooltip>

          <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

          <Tooltip tooltip="Settings">
            <Button
              className="w-7.5 px-0"
              onClick={onOpenSettings}
              size="sm"
              type="button"
              variant="toolbar"
            >
              <SettingsIcon aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <ImageUrlDialog
        onImportImageUrl={onImportImageUrl}
        onOpenChange={setIsImageUrlDialogOpen}
        open={isImageUrlDialogOpen}
      />
    </header>
  );
});

EditorToolbar.displayName = "EditorToolbar";
