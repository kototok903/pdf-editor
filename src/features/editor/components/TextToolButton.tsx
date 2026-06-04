import { memo } from "react";
import {
  ChevronDownIcon,
  RotateCcwIcon,
  SearchAlertIcon,
  TriangleAlertIcon,
  TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { rgbArrayToHex } from "@/features/editor/lib/editor-utils";
import type {
  TextFontId,
  TextOverlayDefaults,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import {
  textFontOptions,
  type DocumentTextFontMenuOption,
} from "@/features/editor/lib/text-fonts";

type TextToolButtonProps = {
  disabled: boolean;
  documentFontOptions: DocumentTextFontMenuOption[];
  isDefault: boolean;
  isSelected: boolean;
  onSettingsChange: (patch: TextOverlayPatch) => void;
  onSettingsReset: () => void;
  onTextToolClick: () => void;
  settings: TextOverlayDefaults;
};

const TextToolButton = memo(function TextToolButton({
  disabled,
  documentFontOptions,
  isDefault,
  isSelected,
  onSettingsChange,
  onSettingsReset,
  onTextToolClick,
  settings,
}: TextToolButtonProps) {
  return (
    <Tooltip tooltip="Text" disabled={disabled}>
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
                  onValueChange={(fontId) => {
                    onSettingsChange({ fontId: fontId as TextFontId });
                  }}
                  value={settings.fontId}
                >
                  <SelectTrigger className="h-8 w-full font-normal">
                    <SelectValue placeholder="Font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {textFontOptions.map((fontOption) => (
                        <SelectItem
                          key={fontOption.id}
                          style={{ fontFamily: fontOption.cssFontFamily }}
                          value={fontOption.id}
                        >
                          {fontOption.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {documentFontOptions.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Document fonts</SelectLabel>
                          {documentFontOptions.map((fontOption) =>
                            fontOption.isAvailable ? (
                              <SelectItem
                                key={fontOption.id}
                                style={{
                                  fontFamily: fontOption.cssFontFamily,
                                }}
                                value={fontOption.id}
                              >
                                <span className="min-w-0 truncate">
                                  {fontOption.label}
                                </span>
                                {!fontOption.isComplete &&
                                  fontOption.reason && (
                                    <DocumentFontReasonTooltip
                                      icon="search"
                                      reason={fontOption.reason}
                                    />
                                  )}
                              </SelectItem>
                            ) : (
                              <UnavailableDocumentFontItem
                                fontOption={fontOption}
                                key={fontOption.id}
                              />
                            ),
                          )}
                        </SelectGroup>
                      </>
                    )}
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
    </Tooltip>
  );
});

function DocumentFontReasonTooltip({
  icon,
  reason,
}: {
  icon: "search" | "triangle";
  reason: string;
}) {
  const Icon = icon === "search" ? SearchAlertIcon : TriangleAlertIcon;

  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <span
          aria-label={reason}
          className="ml-auto inline-flex shrink-0 items-center text-foreground"
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {reason}
      </TooltipContent>
    </TooltipRoot>
  );
}

function UnavailableDocumentFontItem({
  fontOption,
}: {
  fontOption: Extract<DocumentTextFontMenuOption, { isAvailable: false }>;
}) {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <div
          aria-disabled="true"
          className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 text-sm opacity-50 outline-hidden select-none"
          role="option"
        >
          <span className="min-w-0 truncate">{fontOption.label}</span>
          <TriangleAlertIcon
            aria-hidden="true"
            className="ml-auto size-4 shrink-0 text-destructive"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {fontOption.reason}
      </TooltipContent>
    </TooltipRoot>
  );
}

export { TextToolButton };
