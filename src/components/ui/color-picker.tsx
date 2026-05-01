"use client";

import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import { Slider } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  mode: string;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setColor: (color: Parameters<typeof Color>[0]) => void;
  setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined,
);

const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPickerProvider");
  }

  return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
  value?: Parameters<typeof Color>[0];
  defaultValue?: Parameters<typeof Color>[0];
  onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const initialColor = Color(value ?? defaultValue);
  const initialHsl = initialColor.hsl();

  const [hue, setHue] = useState(initialHsl.hue() || 0);
  const [saturation, setSaturation] = useState(initialHsl.saturationl() || 100);
  const [lightness, setLightness] = useState(initialHsl.lightness() || 50);
  const [alpha, setAlpha] = useState(initialColor.alpha() * 100);
  const [mode, setMode] = useState("hex");
  const onChangeRef = useRef(onChange);

  const setColor = useCallback(
    (colorValue: Parameters<typeof Color>[0]) => {
      const color = Color(colorValue);
      const [nextHue, nextSaturation, nextLightness] = color.hsl().array();

      setHue(nextHue);
      setSaturation(nextSaturation);
      setLightness(nextLightness);
      setAlpha(color.alpha() * 100);
    },
    [setAlpha, setHue, setLightness, setSaturation],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!value) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(value);
  }, [setColor, value]);

  useEffect(() => {
    const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
    const rgba = color.rgb().array();

    onChangeRef.current?.([rgba[0], rgba[1], rgba[2], alpha / 100]);
  }, [hue, saturation, lightness, alpha]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setColor,
        setMode,
      }}
    >
      <div
        className={cn("flex size-full flex-col gap-4", className)}
        {...props}
      />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
  ({ className, ...props }: ColorPickerSelectionProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { hue, lightness, saturation, setSaturation, setLightness } =
      useColorPicker();
    const positionX = saturation / 100;
    const topLightness = positionX < 0.01 ? 100 : 50 + 50 * (1 - positionX);
    const positionY =
      topLightness === 0 ? 0 : 1 - Math.min(lightness / topLightness, 1);

    const backgroundGradient = useMemo(() => {
      return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
              linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
              hsl(${hue}, 100%, 50%)`;
    }, [hue]);

    const updateSelectionFromPointer = useCallback(
      (event: PointerEvent) => {
        if (!containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );

        setSaturation(x * 100);

        const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
        setLightness(topLightness * (1 - y));
      },
      [setSaturation, setLightness],
    );

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        if (!isDragging) {
          return;
        }

        updateSelectionFromPointer(event);
      },
      [isDragging, updateSelectionFromPointer],
    );

    useEffect(() => {
      const handlePointerUp = () => {
        setIsDragging(false);
      };

      if (isDragging) {
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
      }

      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }, [isDragging, handlePointerMove]);

    return (
      <div
        className={cn("relative size-full cursor-crosshair rounded", className)}
        onPointerDown={(event) => {
          event.preventDefault();
          setIsDragging(true);
          updateSelectionFromPointer(event.nativeEvent);
        }}
        ref={containerRef}
        style={{ background: backgroundGradient }}
        {...props}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${positionX * 100}%`,
            top: `${positionY * 100}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>
    );
  },
);

ColorPickerSelection.displayName = "ColorPickerSelection";

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <Slider.Root
      className={cn("relative flex h-4 w-full touch-none", className)}
      max={360}
      onValueChange={([nextHue]) => setHue(nextHue)}
      step={1}
      value={[hue]}
      {...props}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Slider.Range className="absolute h-full" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerAlpha = ({
  className,
  ...props
}: ColorPickerAlphaProps) => {
  const { alpha, setAlpha } = useColorPicker();

  return (
    <Slider.Root
      className={cn("relative flex h-4 w-full touch-none", className)}
      max={100}
      onValueChange={([nextAlpha]) => setAlpha(nextAlpha)}
      step={1}
      value={[alpha]}
      {...props}
    >
      <Slider.Track
        className="relative my-0.5 h-3 w-full grow rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-linear-to-r from-transparent to-black/50" />
        <Slider.Range className="absolute h-full rounded-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error EyeDropper API is experimental and not in TS DOM types.
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const color = Color(result.sRGBHex);
      const [nextHue, nextSaturation, nextLightness] = color.hsl().array();

      setHue(nextHue);
      setSaturation(nextSaturation);
      setLightness(nextLightness);
      setAlpha(100);
    } catch (error) {
      console.error("EyeDropper failed:", error);
    }
  };

  return (
    <Button
      className={cn("size-8 shrink-0 p-0 text-muted-foreground", className)}
      onClick={handleEyeDropper}
      size="sm"
      type="button"
      variant="outline"
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ["hex", "rgb", "css", "hsl"];

export const ColorPickerOutput = ({
  className,
  ...props
}: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select onValueChange={setMode} value={mode}>
      <SelectTrigger
        className={cn("h-8 w-20 shrink-0 text-xs", className)}
        {...props}
      >
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

type PercentageInputProps = Omit<
  ComponentProps<typeof Input>,
  "onChange" | "value"
> & {
  onChange: (value: number) => void;
  value: number;
};

const PercentageInput = ({
  className,
  onChange,
  value,
  ...props
}: PercentageInputProps) => {
  return (
    <div className="relative">
      <Input
        className={cn(
          "h-8 w-13 rounded-l-none bg-secondary px-2 text-xs shadow-none",
          className,
        )}
        max={100}
        min={0}
        onChange={(event) => {
          onChange(clamp(Number(event.target.value), 0, 100));
        }}
        onPointerDown={(event) => event.stopPropagation()}
        step={1}
        type="text"
        value={Math.round(value)}
        {...props}
      />
      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const { hue, saturation, lightness, alpha, mode, setAlpha, setColor } =
    useColorPicker();
  const color = Color.hsl(hue, saturation, lightness, alpha / 100);
  const hexValue = color.hex();
  const hexInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (hexInputRef.current) {
      hexInputRef.current.value = hexValue;
    }
  }, [hexValue]);

  if (mode === "hex") {
    return (
      <div
        className={cn(
          "relative flex w-full items-center -space-x-px rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        <Input
          className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
          onChange={(event) => {
            const nextValue = event.target.value;

            if (isHexColor(nextValue)) {
              setColor(nextValue);
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          ref={hexInputRef}
          type="text"
          defaultValue={hexValue}
        />
        <PercentageInput
          onChange={(nextAlpha) => setAlpha(nextAlpha)}
          value={alpha}
        />
      </div>
    );
  }

  if (mode === "rgb") {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div
        className={cn(
          "-space-x-px flex items-center rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        {rgb.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index && "rounded-l-none",
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput
          onChange={(nextAlpha) => setAlpha(nextAlpha)}
          value={alpha}
        />
      </div>
    );
  }

  if (mode === "css") {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn("w-full rounded-md shadow-sm", className)} {...props}>
        <Input
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${rgb.join(", ")}, ${alpha}%)`}
        />
      </div>
    );
  }

  if (mode === "hsl") {
    const hsl = color
      .hsl()
      .array()
      .map((value) => Math.round(value));

    return (
      <div
        className={cn(
          "-space-x-px flex items-center rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        {hsl.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index && "rounded-l-none",
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput
          onChange={(nextAlpha) => setAlpha(nextAlpha)}
          value={alpha}
        />
      </div>
    );
  }

  return null;
};

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: string) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}
