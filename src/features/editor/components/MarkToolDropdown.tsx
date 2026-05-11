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
import {
  getMarkLabel,
  markDefinitions,
} from "@/features/editor/lib/mark-definitions";
import { cn } from "@/lib/utils";

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
                    className={cn(
                      "h-11 px-0",
                      definition.type === markType &&
                        "border-primary bg-primary/10 dark:border-primary dark:bg-primary/20",
                    )}
                    key={definition.type}
                    onClick={() => {
                      onSettingsChange({ markType: definition.type });
                      onMarkToolActivate();
                    }}
                    size="sm"
                    title={getMarkLabel(definition.type)}
                    type="button"
                    variant="outline"
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

export { MarkToolDropdown };
