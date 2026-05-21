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

const signatureFontSize = 96;
const signatureHorizontalPadding = 28;
const signatureVerticalPadding = 22;
const signatureRasterScale = 2;
const fallbackTextHeight = signatureFontSize * 1.25;

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

export { rasterizeTypedSignature, signatureFontSize };
export type { RasterizedSignature, RasterizeSignatureOptions };
