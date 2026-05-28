import { useState } from "react";
import {
  MoonIcon,
  Redo2Icon,
  SunIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TextToolButton } from "@/features/editor/components/TextToolButton";
import { ImageToolDropdown } from "@/features/editor/components/ImageToolDropdown";
import { ImageUrlDialog } from "@/features/editor/components/ImageUrlDialog";
import { MarkToolDropdown } from "@/features/editor/components/MarkToolDropdown";
import { SignatureToolDropdown } from "@/features/editor/components/SignatureToolDropdown";
import type { SignatureCreateInput } from "@/features/editor/components/SignatureCreateDialog";
import type {
  ImageAsset,
  MarkOverlayPatch,
  MarkType,
  TextOverlayDefaults,
  TextOverlayPatch,
  WhiteoutOverlayDefaults,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import { TooltipButton } from "@/features/editor/components/TooltipButton";
import { WhiteoutToolButton } from "@/features/editor/components/WhiteoutToolButton";
import type { DocumentTextFontMenuOption } from "@/features/editor/lib/text-fonts";
import type { Project } from "@/features/editor/lib/editor-projects";
import { ProjectDropdown } from "@/features/editor/components/ProjectDropdown";
import { SidebarsToggle } from "@/features/editor/components/SidebarsToggle";

type EditorToolbarProps = {
  activeProjectId: string | null;
  activeImageAssetId: string | null;
  activeSignatureAssetId: string | null;
  documentFontOptions: DocumentTextFontMenuOption[];
  fileName: string | null;
  imageAssets: ImageAsset[];
  isDark: boolean;
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
  onRedo: () => void;
  onRemoveImageAssetFromRecents: (assetId: string) => void;
  onRemoveSignatureAssetFromRecents: (assetId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectImageAsset: (assetId: string) => void;
  onSelectSignatureAsset: (assetId: string) => void;
  onTextSettingsChange: (patch: TextOverlayPatch) => void;
  onTextSettingsReset: () => void;
  onTextToolClick: () => void;
  onToggleTheme: () => void;
  onToggleLayersSidebar: () => void;
  onTogglePagesSidebar: () => void;
  onUndo: () => void;
  onWhiteoutSettingsChange: (patch: WhiteoutOverlayPatch) => void;
  onWhiteoutSettingsReset: () => void;
  onWhiteoutToolClick: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
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

function EditorToolbar({
  activeProjectId,
  activeImageAssetId,
  activeSignatureAssetId,
  documentFontOptions,
  fileName,
  imageAssets,
  isDark,
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
  onRedo,
  onRemoveImageAssetFromRecents,
  onRemoveSignatureAssetFromRecents,
  onRemoveProject,
  onSelectProject,
  onSelectImageAsset,
  onSelectSignatureAsset,
  onTextSettingsChange,
  onTextSettingsReset,
  onTextToolClick,
  onToggleTheme,
  onToggleLayersSidebar,
  onTogglePagesSidebar,
  onUndo,
  onWhiteoutSettingsChange,
  onWhiteoutSettingsReset,
  onWhiteoutToolClick,
  onZoomIn,
  onZoomOut,
  pageCount,
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

  return (
    <header className="sticky top-0 z-20 border-b bg-toolbar text-toolbar-foreground">
      <div className="flex h-12 items-center gap-1.5 px-2.5">
        <ProjectDropdown
          hasPdf={hasPdf}
          fileName={fileName}
          projects={projects}
          activeProjectId={activeProjectId}
          isExporting={isExporting}
          isLoading={isLoading}
          canCloseProject={canCloseProject}
          onExportPdf={onExportPdf}
          onOpenFile={onOpenFile}
          onCloseActiveProject={onCloseActiveProject}
          onSelectProject={onSelectProject}
          onRemoveProject={onRemoveProject}
        />

        <SidebarsToggle
          isPagesSidebarOpen={isPagesSidebarOpen}
          isLayersSidebarOpen={isLayersSidebarOpen}
          onTogglePagesSidebar={onTogglePagesSidebar}
          onToggleLayersSidebar={onToggleLayersSidebar}
        />

        <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

        <TooltipButton label="Text" disabled={!hasPdf}>
          <div>
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
          </div>
        </TooltipButton>

        <ImageToolDropdown
          activeImageAssetId={activeImageAssetId}
          disabled={!hasPdf}
          imageAssets={imageAssets}
          isSelected={isImageToolActive}
          onImportImageFromClipboard={onImportImageFromClipboard}
          onOpenUrlDialog={() => setIsImageUrlDialogOpen(true)}
          onRemoveImageAssetFromRecents={onRemoveImageAssetFromRecents}
          onSelectImageAsset={onSelectImageAsset}
          onUploadImage={onOpenImageDialog}
        />
        <SignatureToolDropdown
          activeSignatureAssetId={activeSignatureAssetId}
          disabled={!hasPdf}
          isSelected={isSignatureToolActive}
          onCreateSignature={onCreateSignature}
          onRemoveSignatureAssetFromRecents={onRemoveSignatureAssetFromRecents}
          onSelectSignatureAsset={onSelectSignatureAsset}
          signatureAssets={signatureAssets}
        />

        <TooltipButton label="Mark" disabled={!hasPdf}>
          <div>
            <MarkToolDropdown
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
          </div>
        </TooltipButton>

        <TooltipButton label="Whiteout" disabled={!hasPdf}>
          <div>
            <WhiteoutToolButton
              disabled={!hasPdf}
              isDefault={isWhiteoutSettingsDefault}
              isSelected={isWhiteoutToolActive}
              onSettingsChange={onWhiteoutSettingsChange}
              onSettingsReset={onWhiteoutSettingsReset}
              onWhiteoutToolClick={onWhiteoutToolClick}
              settings={whiteoutSettings}
            />
          </div>
        </TooltipButton>

        <div className="ml-auto flex items-center gap-1">
          <TooltipButton label="Undo">
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
          </TooltipButton>
          <TooltipButton label="Redo">
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
          </TooltipButton>

          <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

          <TooltipButton label="Zoom out">
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
          </TooltipButton>
          <div className="w-11 text-center text-xs text-muted-foreground">
            {zoomPercent}%
          </div>
          <TooltipButton label="Zoom in">
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
          </TooltipButton>

          <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

          <TooltipButton label={isDark ? "Use light theme" : "Use dark theme"}>
            <Button
              className="w-7.5 px-0"
              onClick={onToggleTheme}
              size="sm"
              type="button"
              variant="toolbar"
            >
              {isDark ? (
                <SunIcon aria-hidden="true" />
              ) : (
                <MoonIcon aria-hidden="true" />
              )}
            </Button>
          </TooltipButton>
        </div>
      </div>
      <ImageUrlDialog
        onImportImageUrl={onImportImageUrl}
        onOpenChange={setIsImageUrlDialogOpen}
        open={isImageUrlDialogOpen}
      />
    </header>
  );
}

export { EditorToolbar };
