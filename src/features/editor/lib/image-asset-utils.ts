import type { ImageAsset } from "@/features/editor/editor-types";

const imageMimeTypeLabels: Record<string, string> = {
  "image/gif": "GIF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/svg+xml": "SVG",
  "image/webp": "WebP",
};

async function createImageAssetFromFile(file: File): Promise<ImageAsset> {
  return createImageAssetFromBlob({
    blob: file,
    name: file.name || "image",
    source: "upload",
  });
}

async function createImageAssetFromUrl(url: string): Promise<ImageAsset> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to load image (${response.status}).`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error("The URL did not return an image.");
  }

  return createImageAssetFromBlob({
    blob,
    name: getFileNameFromUrl(url),
    source: "url",
  });
}

async function createImageAssetFromBlob({
  blob,
  name,
  source,
}: {
  blob: Blob;
  name: string;
  source: ImageAsset["source"];
}) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const { height, width } = await loadImageDimensions(objectUrl);

    return {
      bytes: await blob.arrayBuffer(),
      formatLabel: getImageFormatLabel(blob.type, name),
      height,
      id: crypto.randomUUID(),
      isHiddenFromRecents: false,
      mimeType: blob.type || "application/octet-stream",
      name,
      objectUrl,
      source,
      width,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function getImageMetadataLabel(asset: ImageAsset) {
  if (asset.formatLabel === "SVG") {
    return asset.formatLabel;
  }

  return `${asset.formatLabel}, ${asset.width}x${asset.height}`;
}

function getImageFormatLabel(mimeType: string, name: string) {
  const label = imageMimeTypeLabels[mimeType];

  if (label) {
    return label;
  }

  const extension = name.split(".").pop()?.toUpperCase();

  return extension || "Image";
}

function getFileNameFromUrl(url: string) {
  try {
    const pathName = new URL(url).pathname;
    const fileName = pathName.split("/").filter(Boolean).at(-1);

    return fileName ? decodeURIComponent(fileName) : "image";
  } catch {
    return "image";
  }
}

function loadImageDimensions(objectUrl: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        height: image.naturalHeight || 120,
        width: image.naturalWidth || 160,
      });
    };
    image.onerror = () => {
      reject(new Error("Unable to decode image."));
    };
    image.src = objectUrl;
  });
}

export {
  createImageAssetFromFile,
  createImageAssetFromUrl,
  getImageMetadataLabel,
};
