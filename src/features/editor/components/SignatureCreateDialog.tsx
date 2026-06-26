import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { PaletteIcon } from "lucide-react";
import SignaturePad from "signature_pad";

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
import { rasterizeDrawnSignature } from "@/features/editor/lib/signature-rasterizer";

export type SignatureCreateInput =
  | {
      color: string;
      fontId: SignatureFontId;
      text: string;
      type: "typed";
    }
  | {
      blob: Blob;
      type: "drawn";
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

type SignatureTab = "draw" | "type";

type ColorControlsProps = {
  color: string;
  isColorPreset: boolean;
  onColorChange: (color: string) => void;
};

type DrawSignatureTabHandle = {
  createBlob: () => Promise<Blob>;
};

export function SignatureCreateDialog({
  onCreateSignature,
  onOpenChange,
  open,
}: SignatureCreateDialogProps) {
  const tabBodyRef = useRef<HTMLDivElement | null>(null);
  const drawTabRef = useRef<DrawSignatureTabHandle | null>(null);
  const drawContentRef = useRef<HTMLDivElement | null>(null);
  const typeContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<SignatureTab>("type");
  const [color, setColor] = useState(signatureColorPresets[0]);
  const [fontId, setFontId] = useState<SignatureFontId>(
    signatureFontOptions[0].id,
  );
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [tabBodyHeight, setTabBodyHeight] = useState<number | null>(null);
  const [text, setText] = useState("");
  const trimmedText = text.trim();
  const canCreate =
    !isCreating &&
    (activeTab === "type" ? trimmedText.length > 0 : hasDrawnSignature);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTabBodyHeight(null);
    }

    onOpenChange(nextOpen);
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as SignatureTab;
    const tabBody = tabBodyRef.current;

    if (tabBody) {
      const currentHeight = tabBody.getBoundingClientRect().height;

      if (currentHeight > 0) {
        setTabBodyHeight(currentHeight);
      }
    }

    setActiveTab(nextTab);
  };

  const handleCreateSignature = async () => {
    if (!canCreate) {
      return;
    }

    setIsCreating(true);

    try {
      const input: SignatureCreateInput =
        activeTab === "type"
          ? {
              color,
              fontId,
              text: trimmedText,
              type: "typed",
            }
          : {
              blob: await createDrawnSignatureBlob(drawTabRef.current),
              type: "drawn",
            };

      const didCreate = await onCreateSignature(input);

      if (didCreate) {
        handleDialogOpenChange(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const isColorPreset = signatureColorPresets.some(
    (presetColor) => presetColor === color,
  );

  useEffect(() => {
    const activeContent =
      activeTab === "type" ? typeContentRef.current : drawContentRef.current;

    if (!activeContent) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = activeContent.getBoundingClientRect().height;

      if (nextHeight > 0) {
        setTabBodyHeight(nextHeight);
      }
    };
    const resizeObserver = new ResizeObserver(updateHeight);
    const animationFrame = window.requestAnimationFrame(updateHeight);

    resizeObserver.observe(activeContent);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [activeTab, open]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="grid-rows-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-3xl">
        <Tabs
          className="min-h-0 gap-0 overflow-hidden"
          onValueChange={handleTabChange}
          value={activeTab}
        >
          <DialogHeader className="border-b px-5 py-4 flex flex-row items-center gap-4 flex-wrap">
            <DialogTitle>Create signature</DialogTitle>
            <TabsList>
              <TabsTrigger value="type">Type</TabsTrigger>
              <TabsTrigger value="draw">Draw</TabsTrigger>
            </TabsList>
          </DialogHeader>
          <div
            className="overflow-hidden transition-[height] duration-200 ease-out"
            ref={tabBodyRef}
            style={
              tabBodyHeight === null ? undefined : { height: tabBodyHeight }
            }
          >
            <TabsContent
              className="min-h-0 overflow-hidden px-5 py-4"
              ref={typeContentRef}
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
                    <ColorControls
                      color={color}
                      isColorPreset={isColorPreset}
                      onColorChange={setColor}
                    />
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
            <TabsContent
              className="min-h-0 overflow-hidden px-5 py-4"
              ref={drawContentRef}
              value="draw"
            >
              <DrawSignatureTab
                color={color}
                isColorPreset={isColorPreset}
                onColorChange={setColor}
                onHasInkChange={setHasDrawnSignature}
                ref={drawTabRef}
              />
            </TabsContent>
          </div>
          <DialogFooter className="m-0 rounded-none">
            <Button
              onClick={() => handleDialogOpenChange(false)}
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

function ColorControls({
  color,
  isColorPreset,
  onColorChange,
}: ColorControlsProps) {
  return (
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
          onClick={() => onColorChange(presetColor)}
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
        >
          <ColorPicker
            className="h-auto gap-3"
            defaultValue={color}
            onChange={(value) => {
              onColorChange(rgbArrayToHex(value));
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
  );
}

const DrawSignatureTab = forwardRef<
  DrawSignatureTabHandle,
  {
    color: string;
    isColorPreset: boolean;
    onColorChange: (color: string) => void;
    onHasInkChange: (hasInk: boolean) => void;
  }
>(function DrawSignatureTab(
  { color, isColorPreset, onColorChange, onHasInkChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const colorRef = useRef(color);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const updateHasInk = useCallback(
    (nextHasInk: boolean) => {
      setHasInk(nextHasInk);
      onHasInkChange(nextHasInk);
    },
    [onHasInkChange],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const signaturePad = signaturePadRef.current;

    if (!canvas || !signaturePad || canvas.offsetWidth <= 0) {
      return;
    }

    const savedData = signaturePad.isEmpty() ? null : signaturePad.toData();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.max(1, Math.floor(canvas.offsetWidth * ratio));
    const height = Math.max(1, Math.floor(canvas.offsetHeight * ratio));

    if (canvas.width === width && canvas.height === height) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.scale(ratio, ratio);
    signaturePad.clear();

    if (savedData) {
      signaturePad.fromData(savedData);
    }

    updateHasInk(Boolean(savedData));
  }, [updateHasInk]);

  useImperativeHandle(
    ref,
    () => ({
      async createBlob() {
        const canvas = canvasRef.current;

        if (!canvas) {
          throw new Error("Unable to create signature image.");
        }

        return rasterizeDrawnSignature(canvas).then(({ blob }) => blob);
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: "rgba(0,0,0,0)",
      maxWidth: 2.8,
      minDistance: 3,
      minWidth: 0.7,
      penColor: colorRef.current,
      throttle: 16,
      velocityFilterWeight: 0.7,
    });

    signaturePadRef.current = signaturePad;
    const handleBeginStroke = () => updateHasInk(true);
    const handleEndStroke = () => updateHasInk(!signaturePad.isEmpty());
    signaturePad.addEventListener("beginStroke", handleBeginStroke);
    signaturePad.addEventListener("endStroke", handleEndStroke);
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      signaturePad.removeEventListener("beginStroke", handleBeginStroke);
      signaturePad.removeEventListener("endStroke", handleEndStroke);
      signaturePad.off();
      signaturePadRef.current = null;
    };
  }, [resizeCanvas, updateHasInk]);

  useEffect(() => {
    colorRef.current = color;

    if (signaturePadRef.current) {
      signaturePadRef.current.penColor = color;
    }
  }, [color]);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    updateHasInk(false);
  };

  return (
    <div className="grid min-h-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">Ink</span>
          <ColorControls
            color={color}
            isColorPreset={isColorPreset}
            onColorChange={onColorChange}
          />
        </div>
        <Button onClick={handleClear} size="sm" type="button" variant="outline">
          Clear
        </Button>
      </div>
      <div className="relative min-h-72 overflow-hidden rounded-lg border bg-page/70">
        <div className="pointer-events-none absolute inset-x-[10%] top-2/3 border-t border-page-foreground/20" />
        <canvas
          aria-label="Draw your signature here"
          className="relative block h-72 w-full touch-none"
          ref={canvasRef}
        />
        {!hasInk && (
          <span className="absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-3/5 text-sm font-medium text-page-foreground/70">
            Draw your signature here
          </span>
        )}
      </div>
    </div>
  );
});

async function createDrawnSignatureBlob(
  drawTab: DrawSignatureTabHandle | null,
) {
  if (!drawTab) {
    throw new Error("Unable to create signature image.");
  }

  return drawTab.createBlob();
}
