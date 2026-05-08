import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { createMarkSvgBlob } from "@/features/editor/lib/mark-definitions";
import {
  APP_OVERLAY_MIME_TYPE,
  parseOverlayClipboardPayload,
  serializeOverlayClipboardPayload,
  toOverlayClipboardPayload,
  type OverlayClipboardPayload,
} from "@/features/editor/lib/overlay-clipboard";
import { findSupportedImageMimeType } from "@/features/editor/lib/image-asset-utils";

type ClipboardWritePlan = {
  customPayload: OverlayClipboardPayload;
  eventItems: {
    strings: Record<string, string>;
  };
  hasBinaryItem: boolean;
  systemItems: Record<string, Blob>;
};

type PasteIntent =
  | {
      imageBlob?: Blob;
      kind: "overlay";
      payload: OverlayClipboardPayload;
    }
  | {
      blob: Blob;
      kind: "external-image";
    }
  | {
      html?: string;
      kind: "external-text";
      text: string;
    }
  | {
      kind: "empty";
    };

function buildOverlayClipboardWritePlan(
  overlay: EditorOverlay,
  imageAssets: ImageAsset[],
): ClipboardWritePlan {
  const customPayload = toOverlayClipboardPayload(overlay);
  const serializedPayload = serializeOverlayClipboardPayload(customPayload);
  const systemItems: Record<string, Blob> = {
    [APP_OVERLAY_MIME_TYPE]: new Blob([serializedPayload], {
      type: APP_OVERLAY_MIME_TYPE,
    }),
  };
  const eventItems: ClipboardWritePlan["eventItems"] = {
    strings: {
      [APP_OVERLAY_MIME_TYPE]: serializedPayload,
    },
  };
  let hasBinaryItem = false;

  if (overlay.type === "text") {
    systemItems["text/plain"] = new Blob([overlay.text], {
      type: "text/plain",
    });
    eventItems.strings["text/plain"] = overlay.text;
  }

  if (overlay.type === "image") {
    const asset = imageAssets.find(
      (imageAsset) => imageAsset.id === overlay.assetId,
    );

    if (asset) {
      const blob = new Blob([new Uint8Array(asset.bytes)], {
        type: asset.mimeType,
      });

      systemItems[asset.mimeType] = blob;
      hasBinaryItem = true;
    }
  }

  if (overlay.type === "mark") {
    const blob = createMarkSvgBlob(overlay);

    systemItems[blob.type] = blob;
    hasBinaryItem = true;
  }

  return {
    customPayload,
    eventItems,
    hasBinaryItem,
    systemItems,
  };
}

function writeClipboardPlanToEvent(
  plan: ClipboardWritePlan,
  clipboardData: DataTransfer,
) {
  for (const [type, value] of Object.entries(plan.eventItems.strings)) {
    clipboardData.setData(type, value);
  }
}

async function writeClipboardPlanToSystemClipboard(plan: ClipboardWritePlan) {
  if (!navigator.clipboard) {
    return;
  }

  if ("ClipboardItem" in window && navigator.clipboard.write) {
    const clipboardItemData = {};
    for (const [type, value] of Object.entries(plan.systemItems)) {
      if (ClipboardItem.supports(type)) {
        clipboardItemData[type] = value;
      }
    }
    if (Object.keys(clipboardItemData).length === 0) {
      return;
    }

    try {
      await navigator.clipboard.write([new ClipboardItem(clipboardItemData)]);
      return;
    } catch (error) {
      console.error("Error writing to system clipboard:", error);
      // Fall back to writeText below when possible.
    }
  }

  const plainText = plan.eventItems.strings["text/plain"];

  if (!plainText || !navigator.clipboard.writeText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(plainText);
  } catch {
    // Clipboard permissions vary by browser; in-app copy state still works.
  }
}

function readPasteIntentFromClipboardData(
  clipboardData: DataTransfer | null,
): PasteIntent {
  if (!clipboardData) {
    return { kind: "empty" };
  }

  const payload = parseOverlayClipboardPayload(
    clipboardData.getData(APP_OVERLAY_MIME_TYPE),
  );
  const imageBlob = getSupportedImageFileFromClipboardData(clipboardData);

  if (payload) {
    return {
      imageBlob: imageBlob ?? undefined,
      kind: "overlay",
      payload,
    };
  }

  if (imageBlob) {
    return {
      blob: imageBlob,
      kind: "external-image",
    };
  }

  const html = clipboardData.getData("text/html");
  const text = clipboardData.getData("text/plain");

  if (html || text) {
    return {
      html: html || undefined,
      kind: "external-text",
      text,
    };
  }

  return { kind: "empty" };
}

async function readPasteIntentFromAsyncClipboard(): Promise<PasteIntent> {
  if (navigator.clipboard && "read" in navigator.clipboard) {
    try {
      const items = await navigator.clipboard.read();
      const htmlFallbacks: { html: string; text: string }[] = [];
      const plainTextFallbacks: string[] = [];
      let imageBlob: Blob | null = null;

      for (const item of items) {
        if (item.types.includes(APP_OVERLAY_MIME_TYPE)) {
          const payload = parseOverlayClipboardPayload(
            await blobToText(await item.getType(APP_OVERLAY_MIME_TYPE)),
          );
          const overlayImageBlob = await getImageBlobFromClipboardItem(item);

          if (payload) {
            return {
              imageBlob: overlayImageBlob ?? imageBlob ?? undefined,
              kind: "overlay",
              payload,
            };
          }
        }

        imageBlob = imageBlob ?? (await getImageBlobFromClipboardItem(item));

        if (item.types.includes("text/html")) {
          htmlFallbacks.push({
            html: await blobToText(await item.getType("text/html")),
            text: item.types.includes("text/plain")
              ? await blobToText(await item.getType("text/plain"))
              : "",
          });
        } else if (item.types.includes("text/plain")) {
          plainTextFallbacks.push(
            await blobToText(await item.getType("text/plain")),
          );
        }
      }

      if (imageBlob) {
        return {
          blob: imageBlob,
          kind: "external-image",
        };
      }

      const htmlFallback = htmlFallbacks.find(
        (fallback) => fallback.html || fallback.text,
      );

      if (htmlFallback) {
        return {
          html: htmlFallback.html,
          kind: "external-text",
          text: htmlFallback.text,
        };
      }

      const text = plainTextFallbacks.find(Boolean);

      if (text) {
        return {
          kind: "external-text",
          text,
        };
      }
    } catch {
      // Fall back to readText below.
    }
  }

  if (!navigator.clipboard?.readText) {
    return { kind: "empty" };
  }

  try {
    const text = await navigator.clipboard.readText();

    return text ? { kind: "external-text", text } : { kind: "empty" };
  } catch {
    return { kind: "empty" };
  }
}

function getSupportedImageFileFromClipboardData(
  clipboardData: Pick<DataTransfer, "items"> | null,
) {
  if (!clipboardData) {
    return null;
  }

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind !== "file" || !findSupportedImageMimeType([item.type])) {
      continue;
    }

    const file = item.getAsFile();

    if (file) {
      return file;
    }
  }

  return null;
}

async function getImageBlobFromClipboardItem(item: ClipboardItem) {
  const imageType = findSupportedImageMimeType(item.types);

  return imageType ? item.getType(imageType) : null;
}

function blobToText(blob: Blob) {
  return blob.text();
}

export {
  buildOverlayClipboardWritePlan,
  getSupportedImageFileFromClipboardData,
  readPasteIntentFromAsyncClipboard,
  readPasteIntentFromClipboardData,
  writeClipboardPlanToEvent,
  writeClipboardPlanToSystemClipboard,
};
export type { ClipboardWritePlan, PasteIntent };
