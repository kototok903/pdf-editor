import type { ReactNode } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MoonIcon,
  PanelLeftIcon,
  Redo2Icon,
  SignatureIcon,
  SquareIcon,
  SunIcon,
  TypeIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedButton } from "@/components/ui/segmented-button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipButton } from "@/features/editor/components/TooltipButton";

type EditorToolbarProps = {
  fileName: string | null;
  isDark: boolean;
  onOpenFile: () => void;
  onTextToolClick: () => void;
  onToggleTheme: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
  status: "empty" | "loading" | "loaded" | "error";
  zoomPercent: number;
};

function EditorToolbar({
  fileName,
  isDark,
  onOpenFile,
  onTextToolClick,
  onToggleTheme,
  onZoomIn,
  onZoomOut,
  pageCount,
  status,
  zoomPercent,
}: EditorToolbarProps) {
  const hasPdf = pageCount > 0;
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-20 border-b bg-toolbar text-toolbar-foreground">
      <div className="flex h-12 items-center gap-1.5 px-2.5">
        <TooltipButton label="Toggle pages">
          <Button
            className="w-[30px] px-0"
            size="sm"
            type="button"
            variant="toolbar"
          >
            <PanelLeftIcon aria-hidden="true" />
          </Button>
        </TooltipButton>

        <div className="mr-1 min-w-24">
          {isLoading ? (
            <>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-1.5 h-2.5 w-14" />
            </>
          ) : (
            <>
              <div className="max-w-36 truncate text-xs font-semibold">
                {fileName ?? "No PDF open"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {pageCount > 0 ? `${pageCount} pages` : "Choose a file"}
              </div>
            </>
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
            <DropdownMenuItem disabled={!hasPdf}>
              <DownloadIcon aria-hidden="true" /> Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

        <SegmentedButton
          disabled={!hasPdf}
          isActive
          onClick={onTextToolClick}
          mainLabel="Text tool"
          menuLabel="Text settings"
        >
          <TypeIcon aria-hidden="true" />
        </SegmentedButton>

        <DropdownTool
          disabled={!hasPdf}
          label="Image"
          icon={<ImageIcon aria-hidden="true" />}
        />
        <DropdownTool
          disabled={!hasPdf}
          label="Sign"
          icon={<SignatureIcon aria-hidden="true" />}
        />

        <SegmentedButton
          disabled={!hasPdf}
          mainLabel="Mark tool"
          menuLabel="Mark options"
        >
          <CheckIcon aria-hidden="true" />
        </SegmentedButton>

        <SegmentedButton
          disabled={!hasPdf}
          mainLabel="Whiteout tool"
          menuLabel="Whiteout color options"
        >
          <SquareIcon aria-hidden="true" />
        </SegmentedButton>

        <div className="ml-auto flex items-center gap-1">
          <TooltipButton label="Undo">
            <Button
              className="w-[30px] px-0"
              disabled={!hasPdf}
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
              disabled={!hasPdf}
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
