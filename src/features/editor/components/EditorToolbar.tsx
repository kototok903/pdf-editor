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
  RotateCcwIcon,
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
import {
  ColorPicker,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { SegmentedButton } from "@/components/ui/segmented-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  TextOverlayDefaults,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { TooltipButton } from "@/features/editor/components/TooltipButton";

type EditorToolbarProps = {
  fileName: string | null;
  isDark: boolean;
  isTextSettingsDefault: boolean;
  isTextToolActive: boolean;
  onOpenFile: () => void;
  onTextSettingsChange: (patch: TextOverlayPatch) => void;
  onTextSettingsReset: () => void;
  onTextToolClick: () => void;
  onToggleTheme: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
  status: "empty" | "loading" | "loaded" | "error";
  textSettings: TextOverlayDefaults;
  zoomPercent: number;
};

const fontOptions = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
];

function EditorToolbar({
  fileName,
  isDark,
  isTextSettingsDefault,
  isTextToolActive,
  onOpenFile,
  onTextSettingsChange,
  onTextSettingsReset,
  onTextToolClick,
  onToggleTheme,
  onZoomIn,
  onZoomOut,
  pageCount,
  status,
  textSettings,
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

        <TextToolButton
          disabled={!hasPdf}
          isDefault={isTextSettingsDefault}
          isSelected={isTextToolActive}
          onSettingsChange={onTextSettingsChange}
          onSettingsReset={onTextSettingsReset}
          onTextToolClick={onTextToolClick}
          settings={textSettings}
        />

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

function TextToolButton({
  disabled,
  isDefault,
  isSelected,
  onSettingsChange,
  onSettingsReset,
  onTextToolClick,
  settings,
}: {
  disabled: boolean;
  isDefault: boolean;
  isSelected: boolean;
  onSettingsChange: (patch: TextOverlayPatch) => void;
  onSettingsReset: () => void;
  onTextToolClick: () => void;
  settings: TextOverlayDefaults;
}) {
  return (
    <div className="inline-flex shrink-0">
      <Button
        aria-label="Text tool"
        className="rounded-r-none px-2"
        disabled={disabled}
        onClick={onTextToolClick}
        size="sm"
        type="button"
        variant={isSelected ? "toolbar-active" : "toolbar"}
      >
        <TypeIcon aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Text settings"
            className="-ml-px w-6 rounded-l-none px-0"
            disabled={disabled}
            size="sm"
            type="button"
            variant={isSelected ? "toolbar-active" : "toolbar"}
          >
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 p-3"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="space-y-3">
            <div className="grid gap-1.5 text-xs font-medium">
              <span>Font</span>
              <Select
                onValueChange={(fontFamily) => {
                  onSettingsChange({ fontFamily });
                }}
                value={settings.fontFamily}
              >
                <SelectTrigger className="h-8 w-full font-normal">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((fontOption) => (
                    <SelectItem
                      key={fontOption.value}
                      style={{ fontFamily: fontOption.value }}
                      value={fontOption.value}
                    >
                      {fontOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5 text-xs font-medium">
              <span>Size</span>
              <Input
                className="h-8 font-normal"
                min={8}
                max={96}
                onChange={(event) => {
                  onSettingsChange({ fontSize: Number(event.target.value) });
                }}
                type="number"
                value={settings.fontSize}
              />
            </div>

            <div className="grid gap-1.5 text-xs font-medium">
              <span>Color</span>
              <ColorPicker
                className="h-auto gap-3"
                defaultValue={settings.color}
                onChange={(value) => {
                  onSettingsChange({ color: rgbArrayToHex(value) });
                }}
                value={settings.color}
              >
                <ColorPickerSelection className="h-28 rounded-md" />
                <ColorPickerHue />
                <ColorPickerFormat />
              </ColorPicker>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button
                disabled={isDefault}
                onClick={onSettingsReset}
                size="xs"
                type="button"
                variant="outline"
              >
                <RotateCcwIcon aria-hidden="true" />
                Reset
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function rgbArrayToHex(value: unknown) {
  const [red = 0, green = 0, blue = 0] = Array.isArray(value) ? value : [];

  return `#${[red, green, blue]
    .map((colorPart) =>
      Math.round(colorPart).toString(16).padStart(2, "0").slice(0, 2),
    )
    .join("")}`;
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
