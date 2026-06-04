import type { SignatureFontOption } from "@/features/editor/lib/signature-fonts";

type RasterizeSignatureOptions = {
  color: string;
  font: SignatureFontOption;
  text: string;
};

type RasterizedSignature = {
  blob: Blob;
  height: number;
  width: number;
};

type PixelBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const signatureFontSize = 96;
const signatureHorizontalPadding = 28;
const signatureVerticalPadding = 22;
const signatureRasterScale = 2;
const fallbackTextHeight = signatureFontSize * 1.25;
const drawnSignaturePadding = 12;

async function rasterizeTypedSignature({
  color,
  font,
  text,
}: RasterizeSignatureOptions): Promise<RasterizedSignature> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Enter a name or initials.");
  }

  await loadSignatureFont(font);

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");

  if (!measureContext) {
    throw new Error("Unable to create signature image.");
  }

  const fontValue = `${signatureFontSize}px ${font.cssFontFamily}`;
  measureContext.font = fontValue;
  measureContext.textBaseline = "alphabetic";

  const metrics = measureContext.measureText(trimmedText);
  const ascent = getFinitePositiveMetric(
    metrics.actualBoundingBoxAscent,
    signatureFontSize * 0.9,
  );
  const descent = getFinitePositiveMetric(
    metrics.actualBoundingBoxDescent,
    signatureFontSize * 0.35,
  );
  const textHeight = Math.max(ascent + descent, fallbackTextHeight);
  const cssWidth = Math.ceil(metrics.width + signatureHorizontalPadding * 2);
  const cssHeight = Math.ceil(textHeight + signatureVerticalPadding * 2);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create signature image.");
  }

  canvas.width = Math.max(1, Math.ceil(cssWidth * signatureRasterScale));
  canvas.height = Math.max(1, Math.ceil(cssHeight * signatureRasterScale));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  context.scale(signatureRasterScale, signatureRasterScale);
  context.font = fontValue;
  context.fillStyle = color;
  context.textBaseline = "alphabetic";
  context.fillText(
    trimmedText,
    signatureHorizontalPadding,
    signatureVerticalPadding + ascent,
  );

  return {
    blob: await canvasToBlob(canvas),
    height: cssHeight,
    width: cssWidth,
  };
}

async function rasterizeDrawnSignature(
  sourceCanvas: HTMLCanvasElement,
): Promise<RasterizedSignature> {
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Unable to create signature image.");
  }

  const sourceImageData = sourceContext.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  const bounds = getOpaquePixelBounds(sourceImageData);

  if (!bounds) {
    throw new Error("Draw a signature first.");
  }

  const cropX = Math.max(0, bounds.x - drawnSignaturePadding);
  const cropY = Math.max(0, bounds.y - drawnSignaturePadding);
  const cropRight = Math.min(
    sourceCanvas.width,
    bounds.x + bounds.width + drawnSignaturePadding,
  );
  const cropBottom = Math.min(
    sourceCanvas.height,
    bounds.y + bounds.height + drawnSignaturePadding,
  );
  const cropWidth = Math.max(1, cropRight - cropX);
  const cropHeight = Math.max(1, cropBottom - cropY);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create signature image.");
  }

  canvas.width = cropWidth;
  canvas.height = cropHeight;
  context.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return {
    blob: await canvasToBlob(canvas),
    height: cropHeight,
    width: cropWidth,
  };
}

async function loadSignatureFont(font: SignatureFontOption) {
  if (!("fonts" in document)) {
    return;
  }

  await document.fonts.load(`${signatureFontSize}px ${font.cssFontFamily}`);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to create signature image."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function getFinitePositiveMetric(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getOpaquePixelBounds(imageData: ImageData): PixelBounds | null {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alphaIndex = (y * imageData.width + x) * 4 + 3;

      if (imageData.data[alphaIndex] === 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    height: maxY - minY + 1,
    width: maxX - minX + 1,
    x: minX,
    y: minY,
  };
}

export {
  getOpaquePixelBounds,
  rasterizeDrawnSignature,
  rasterizeTypedSignature,
  signatureFontSize,
};
export type { RasterizedSignature, RasterizeSignatureOptions };
