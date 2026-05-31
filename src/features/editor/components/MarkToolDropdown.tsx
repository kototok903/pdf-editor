import { ChevronDownIcon, RotateCcwIcon } from "lucide-react";

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
import { MarkGlyph } from "@/features/editor/components/MarkGlyph";
import type {
  MarkOverlayPatch,
  MarkType,
} from "@/features/editor/editor-types";
import { markDefinitions } from "@/features/editor/lib/mark-definitions";
import { rgbArrayToHex } from "@/features/editor/lib/editor-utils";
import { Tooltip } from "@/components/ui/tooltip";

type MarkToolDropdownProps = {
  color: string;
  disabled: boolean;
  isDefault: boolean;
  isSelected: boolean;
  markType: MarkType;
  onMarkToolActivate: () => void;
  onMarkToolClick: () => void;
  onSettingsReset: () => void;
  onSettingsChange: (patch: MarkOverlayPatch) => void;
};

function MarkToolDropdown({
  color,
  disabled,
  isDefault,
  isSelected,
  markType,
  onMarkToolActivate,
  onMarkToolClick,
  onSettingsReset,
  onSettingsChange,
}: MarkToolDropdownProps) {
  const variant = isSelected ? "toolbar-active" : "toolbar";

  return (
    <Tooltip tooltip="Mark" disabled={disabled}>
      <div className="inline-flex shrink-0">
        <Button
          aria-label="Mark tool"
          className="rounded-r-none px-2"
          disabled={disabled}
          onClick={onMarkToolClick}
          size="sm"
          type="button"
          variant={variant}
        >
          <MarkGlyph
            className="size-4"
            color="currentColor"
            markType={markType}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Mark options"
              className="-ml-px w-6 rounded-l-none px-0"
              disabled={disabled}
              size="sm"
              type="button"
              variant={variant}
            >
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 p-3"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="grid gap-2 text-xs font-medium">
                <span>Type</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {markDefinitions.map((definition) => (
                    <Button
                      aria-label={definition.label}
                      className="h-11 p-0"
                      key={definition.type}
                      onClick={() => {
                        onSettingsChange({ markType: definition.type });
                        onMarkToolActivate();
                      }}
                      type="button"
                      variant={
                        definition.type === markType ? "page-active" : "page"
                      }
                    >
                      <MarkGlyph
                        className="size-6"
                        color={color}
                        markType={definition.type}
                      />
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5 text-xs font-medium">
                <span>Color</span>
                <ColorPicker
                  className="h-auto gap-3"
                  defaultValue={color}
                  onChange={(value) => {
                    onSettingsChange({ color: rgbArrayToHex(value) });
                  }}
                  value={color}
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
}

export { MarkToolDropdown };
