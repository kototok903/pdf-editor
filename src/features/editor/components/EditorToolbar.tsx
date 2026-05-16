import { useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  FileDownIcon,
  FileIcon,
  FileTextIcon,
  Layers2Icon,
  MoonIcon,
  Redo2Icon,
  SignatureIcon,
  SunIcon,
  Undo2Icon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import {
  FileTextDashedIcon,
  Layers2DashedIcon,
} from "@/components/ui/custom-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TextToolButton } from "@/features/editor/components/TextToolButton";
import { ImageToolDropdown } from "@/features/editor/components/ImageToolDropdown";
import { ImageUrlDialog } from "@/features/editor/components/ImageUrlDialog";
import { MarkToolDropdown } from "@/features/editor/components/MarkToolDropdown";
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

type EditorToolbarProps = {
  activeImageAssetId: string | null;
  fileName: string | null;
  imageAssets: ImageAsset[];
  isDark: boolean;
  isImageToolActive: boolean;
  isLayersSidebarOpen: boolean;
  isPagesSidebarOpen: boolean;
  isMarkSettingsDefault: boolean;
  isMarkToolActive: boolean;
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
  onCloseDraft: () => void;
  onExportPdf: () => void;
  onOpenFile: () => void;
  onOpenImageDialog: () => void;
  onRedo: () => void;
  onRemoveImageAssetFromRecents: (assetId: string) => void;
  onSelectImageAsset: (assetId: string) => void;
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
  status: "empty" | "loading" | "loaded" | "error";
  canRedo: boolean;
  canUndo: boolean;
  isExporting: boolean;
  markSettings: {
    color: string;
    markType: MarkType;
  };
  canCloseDraft: boolean;
  textSettings: TextOverlayDefaults;
  whiteoutSettings: WhiteoutOverlayDefaults;
  zoomPercent: number;
};

function EditorToolbar({
  activeImageAssetId,
  fileName,
  imageAssets,
  isDark,
  isImageToolActive,
  isLayersSidebarOpen,
  isPagesSidebarOpen,
  isMarkSettingsDefault,
  isMarkToolActive,
  isTextSettingsDefault,
  isTextToolActive,
  isWhiteoutSettingsDefault,
  isWhiteoutToolActive,
  markSettings,
  canRedo,
  canCloseDraft,
  canUndo,
  onCloseDraft,
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
  onSelectImageAsset,
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
        <div className="inline-flex shrink-0">
          <TooltipButton label="Toggle pages">
            <Button
              aria-label="Toggle pages sidebar"
              aria-pressed={isPagesSidebarOpen}
              className="w-7.5 rounded-r-none px-0"
              onClick={onTogglePagesSidebar}
              size="sm"
              type="button"
              variant="toolbar"
            >
              {isPagesSidebarOpen ? (
                <FileTextDashedIcon aria-hidden="true" />
              ) : (
                <FileTextIcon aria-hidden="true" />
              )}
            </Button>
          </TooltipButton>
          <TooltipButton label="Toggle layers">
            <Button
              aria-label="Toggle layers sidebar"
              aria-pressed={isLayersSidebarOpen}
              className="-ml-px w-7.5 rounded-l-none px-0"
              onClick={onToggleLayersSidebar}
              size="sm"
              type="button"
              variant="toolbar"
            >
              {isLayersSidebarOpen ? (
                <Layers2DashedIcon aria-hidden="true" />
              ) : (
                <Layers2Icon aria-hidden="true" />
              )}
            </Button>
          </TooltipButton>
        </div>

        <div className="mr-1 min-w-24">
          {isLoading ? (
            <>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-1.5 h-2.5 w-14" />
            </>
          ) : (
            <TooltipButton label={fileName ?? ""} disabled={!fileName}>
              <div>
                <div className="max-w-36 truncate text-xs font-semibold">
                  {fileName ?? "No PDF open"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pageCount > 0
                    ? `${pageCount} page${pageCount === 1 ? "" : "s"}`
                    : "Choose a file"}
                </div>
              </div>
            </TooltipButton>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" type="button" variant="toolbar">
              <FileTextIcon aria-hidden="true" />
              File
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-max min-w-40">
            <DropdownMenuItem
              onSelect={() => {
                onOpenFile();
              }}
            >
              <FileIcon aria-hidden="true" /> Open PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasPdf || isExporting}
              onSelect={onExportPdf}
            >
              <FileDownIcon aria-hidden="true" />{" "}
              {isExporting ? "Exporting..." : "Export PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canCloseDraft} onSelect={onCloseDraft}>
              <XIcon aria-hidden="true" /> Close Draft
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

        <TooltipButton label="Text" disabled={!hasPdf}>
          <div>
            <TextToolButton
              disabled={!hasPdf}
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
        <DropdownTool
          disabled
          label="Sign"
          icon={<SignatureIcon aria-hidden="true" />}
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
              className="w-[30px] px-0"
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
              className="w-[30px] px-0"
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
              className="w-[30px] px-0"
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
              className="w-[30px] px-0"
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
              className="w-[30px] px-0"
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

function DropdownTool({
  disabled,
  icon,
  label,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} size="sm" type="button" variant="toolbar">
          {icon}
          {label}
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-max min-w-40">
        <DropdownMenuItem>{label} option</DropdownMenuItem>
        <DropdownMenuItem>Manage {label.toLowerCase()}s</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { EditorToolbar };
