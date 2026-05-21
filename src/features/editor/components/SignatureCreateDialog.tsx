import { useState, type CSSProperties } from "react";
import { PaletteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { SignatureFontId } from "@/features/editor/lib/signature-fonts";
import { signatureFontOptions } from "@/features/editor/lib/signature-fonts";
import { rgbArrayToHex } from "@/features/editor/lib/editor-utils";

type SignatureCreateInput = {
  color: string;
  fontId: SignatureFontId;
  text: string;
};

type SignatureCreateDialogProps = {
  onCreateSignature: (input: SignatureCreateInput) => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const signatureColorPresets = [
  "#111827",
  "#1d4ed8",
  "#2563eb",
  "#dc2626",
  "#047857",
];

function SignatureCreateDialog({
  onCreateSignature,
  onOpenChange,
  open,
}: SignatureCreateDialogProps) {
  const [color, setColor] = useState(signatureColorPresets[0]);
  const [fontId, setFontId] = useState<SignatureFontId>(
    signatureFontOptions[0].id,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [text, setText] = useState("");
  const trimmedText = text.trim();
  const canCreate = trimmedText.length > 0 && !isCreating;

  const handleCreateSignature = async () => {
    if (!canCreate) {
      return;
    }

    setIsCreating(true);

    try {
      const didCreate = await onCreateSignature({
        color,
        fontId,
        text: trimmedText,
      });

      if (didCreate) {
        onOpenChange(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const isColorPreset = signatureColorPresets.some(
    (presetColor) => presetColor === color,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-rows-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-3xl">
        <Tabs defaultValue="type" className="min-h-0 gap-0 overflow-hidden">
          <DialogHeader className="border-b px-5 py-4 flex flex-row items-center gap-4 flex-wrap">
            <DialogTitle>Create signature</DialogTitle>
            <TabsList>
              <TabsTrigger value="type">Type</TabsTrigger>
              <TabsTrigger disabled value="draw">
                Draw
              </TabsTrigger>
            </TabsList>
          </DialogHeader>
          <TabsContent
            className="min-h-0 overflow-hidden px-5 py-4"
            value="type"
          >
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="grid gap-1.5">
                  <label
                    className="text-xs font-medium"
                    htmlFor="signature-name"
                  >
                    Name or initials
                  </label>
                  <Input
                    autoFocus
                    id="signature-name"
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCreateSignature();
                      }
                    }}
                    placeholder="Enter name"
                    value={text}
                  />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium">Color</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {signatureColorPresets.map((presetColor) => (
                      <button
                        aria-label={`Use ${presetColor}`}
                        className={cn(
                          "size-7 rounded-full border border-border outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50",
                          presetColor === color &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                        key={presetColor}
                        onClick={() => setColor(presetColor)}
                        style={{ backgroundColor: presetColor }}
                        type="button"
                      />
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          aria-label="Choose custom color"
                          className={cn(
                            "size-7 rounded-full p-0",
                            !isColorPreset &&
                              "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          )}
                          size="sm"
                          style={{
                            background:
                              "conic-gradient(#ef4444,#f97316,#eab308,#22c55e,#06b6d4,#2563eb,#a855f7,#ef4444)",
                          }}
                          type="button"
                          variant="outline"
                        >
                          <PaletteIcon
                            aria-hidden="true"
                            className="size-3.5 text-white drop-shadow"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-72"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <ColorPicker
                          className="h-auto gap-3"
                          defaultValue={color}
                          onChange={(value) => {
                            setColor(rgbArrayToHex(value));
                          }}
                          value={color}
                        >
                          <ColorPickerSelection className="h-36 rounded-md" />
                          <ColorPickerHue />
                          <ColorPickerFormat />
                        </ColorPicker>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5">
                <span className="text-xs font-medium">Styles</span>
                <div className="-m-1 grid min-h-0 gap-2 overflow-y-auto overflow-x-hidden p-1 sm:grid-cols-3">
                  {signatureFontOptions.map((fontOption) => (
                    <Button
                      aria-label={`Use ${fontOption.label}`}
                      className="grid min-h-20 min-w-0 place-items-center rounded-lg text-center text-3xl leading-loose text-(--signature-color) transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:z-10"
                      key={fontOption.id}
                      onClick={() => setFontId(fontOption.id)}
                      style={
                        {
                          "--signature-color": color,
                          fontFamily: fontOption.cssFontFamily,
                        } as CSSProperties
                      }
                      type="button"
                      variant={
                        fontOption.id === fontId ? "page-active" : "page"
                      }
                    >
                      <span className="w-full truncate">
                        {trimmedText
                          ? `\u00A0${trimmedText}\u00A0`
                          : "\u00A0Signature\u00A0"}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent className="px-5 py-4" value="draw">
            <div className="grid min-h-64 place-items-center rounded-lg border bg-background text-sm text-muted-foreground">
              Draw will be added later.
            </div>
          </TabsContent>
          <DialogFooter className="m-0 rounded-none">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!canCreate}
              onClick={handleCreateSignature}
              type="button"
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { SignatureCreateDialog };
export type { SignatureCreateInput };
