import { ChevronDownIcon, RotateCcwIcon, TypeIcon } from "lucide-react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rgbArrayToHex } from "@/features/editor/lib/editor-utils";
import type {
  TextFontId,
  TextOverlayDefaults,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { textFontOptions } from "@/features/editor/lib/text-fonts";

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
                onValueChange={(fontId) => {
                  onSettingsChange({ fontId: fontId as TextFontId });
                }}
                value={settings.fontId}
              >
                <SelectTrigger className="h-8 w-full font-normal">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  {textFontOptions.map((fontOption) => (
                    <SelectItem
                      key={fontOption.id}
                      style={{ fontFamily: fontOption.cssFontFamily }}
                      value={fontOption.id}
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

export { TextToolButton };
