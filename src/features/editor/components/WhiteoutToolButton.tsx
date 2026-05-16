import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import type {
  WhiteoutOverlayDefaults,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import {
  ColorPicker,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { rgbArrayToHex } from "@/features/editor/lib/editor-utils";

function WhiteoutToolButton({
  disabled,
  isDefault,
  isSelected,
  onSettingsChange,
  onSettingsReset,
  onWhiteoutToolClick,
  settings,
}: {
  disabled: boolean;
  isDefault: boolean;
  isSelected: boolean;
  onSettingsChange: (patch: WhiteoutOverlayPatch) => void;
  onSettingsReset: () => void;
  onWhiteoutToolClick: () => void;
  settings: WhiteoutOverlayDefaults;
}) {
  return (
    <div className="inline-flex shrink-0">
      <Button
        aria-label="Whiteout tool"
        className="rounded-r-none px-2"
        disabled={disabled}
        onClick={onWhiteoutToolClick}
        size="sm"
        type="button"
        variant={isSelected ? "toolbar-active" : "toolbar"}
      >
        <SquareIcon aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Whiteout settings"
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
            <div className="grid gap-1.5">
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

export { WhiteoutToolButton };
