import { useCallback, useState } from "react";
import { toast } from "sonner";

import type {
  EditorOverlay,
  EditorOverlayInput,
  ImageAsset,
  TextOverlayDefaults,
} from "@/features/editor/editor-types";
import {
  extractPlainTextFromHtml,
  textOverlayInputFromHtml,
  textOverlayInputFromPlainText,
  textOverlayInputUsingCurrentSettings,
} from "@/features/editor/lib/clipboard-text-utils";
import {
  buildOverlayClipboardWritePlan,
  readPasteIntentFromAsyncClipboard,
  readPasteIntentFromClipboardData,
  writeClipboardPlanToEvent,
  writeClipboardPlanToSystemClipboard,
  type PasteIntent,
} from "@/features/editor/lib/editor-clipboard";
import {
  createExternalPasteRecord,
  shouldSkipExternalPaste,
  type ExternalPasteRecord,
} from "@/features/editor/lib/external-paste-dedupe";
import { createImageSha256Signature } from "@/features/editor/lib/image-asset-utils";
import { createImageOverlayRectAtPoint } from "@/features/editor/lib/overlay-coordinate-utils";
import {
  duplicateOverlayInput,
  getOverlayClipboardPayloadKey,
  toOverlayInput,
  type OverlayClipboardPayload,
} from "@/features/editor/lib/overlay-clipboard";
import type { PageSize } from "@/features/pdf/components/PdfPageView";

type LastOverlayPaste = {
  pasteCount: number;
  payloadKey: string;
};
type PageBounds = { height: number; width: number };

type AddRenderableOverlay = (
  input: EditorOverlayInput,
  options?: { additionalRenderableImageAssetIds?: string[] },
) => EditorOverlay | null;

type UseEditorClipboardActionsOptions = {
  addImageBlob: (blob: Blob, sha256Signature?: string) => Promise<ImageAsset>;
  addRenderableOverlay: AddRenderableOverlay;
  currentPage: number;
  getCurrentPageSize: () => PageBounds | null;
  getCurrentTextDefaults: () => TextOverlayDefaults;
  imageAssets: ImageAsset[];
  overlays: EditorOverlay[];
  pageSizes: Record<number, PageSize>;
  selectedOverlay: EditorOverlay | null;
  zoom: number;
};

function useEditorClipboardActions({
  addImageBlob,
  addRenderableOverlay,
  currentPage,
  getCurrentPageSize,
  getCurrentTextDefaults,
  imageAssets,
  overlays,
  pageSizes,
  selectedOverlay,
  zoom,
}: UseEditorClipboardActionsOptions) {
  const [lastOverlayPaste, setLastOverlayPaste] =
    useState<LastOverlayPaste | null>(null);
  const [lastExternalPaste, setLastExternalPaste] =
    useState<ExternalPasteRecord | null>(null);

  const clearClipboardHistory = useCallback(() => {
    setLastOverlayPaste(null);
    setLastExternalPaste(null);
  }, []);

  const handleCopySelectedOverlay = useCallback(
    (event?: ClipboardEvent) => {
      if (!selectedOverlay) {
        return;
      }

      const writePlan = buildOverlayClipboardWritePlan(
        selectedOverlay,
        imageAssets,
      );

      // Always use event clipboard write since async API fails to write custom format items.
      if (event?.clipboardData) {
        writeClipboardPlanToEvent(writePlan, event.clipboardData);
        return;
      }

      void writeClipboardPlanToSystemClipboard(writePlan);
    },
    [imageAssets, selectedOverlay],
  );

  const handleDuplicateSelectedOverlay = useCallback(() => {
    if (!selectedOverlay) {
      return;
    }

    const pageSize = pageSizes[selectedOverlay.pageNumber];

    if (!pageSize) {
      return;
    }

    addRenderableOverlay(
      duplicateOverlayInput(selectedOverlay, {
        pageSize: {
          height: pageSize.height / zoom,
          width: pageSize.width / zoom,
        },
      }),
    );
  }, [addRenderableOverlay, pageSizes, selectedOverlay, zoom]);

  const addPastedImageOverlay = useCallback(
    async (image: Blob, pageSize: PageBounds, sha256Signature?: string) => {
      const nextSha256Signature =
        sha256Signature ?? (await createImageSha256Signature(image));
      const signature = createImageClipboardSignature(
        image.type,
        nextSha256Signature,
      );

      if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
        return;
      }

      const asset = await addImageBlob(image, nextSha256Signature);
      const overlay = addRenderableOverlay(
        createCenteredImageOverlayInput(asset, currentPage, pageSize),
        { additionalRenderableImageAssetIds: [asset.id] },
      );

      if (overlay) {
        setLastExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    },
    [
      addImageBlob,
      addRenderableOverlay,
      currentPage,
      lastExternalPaste,
      overlays,
    ],
  );

  const getNextOverlayPaste = useCallback(
    (payload: OverlayClipboardPayload) => {
      const payloadKey = getOverlayClipboardPayloadKey(payload);
      const pasteCount =
        lastOverlayPaste?.payloadKey === payloadKey
          ? lastOverlayPaste.pasteCount + 1
          : 1;

      return { pasteCount, payloadKey };
    },
    [lastOverlayPaste],
  );

  const pasteOverlayIntent = useCallback(
    async (
      intent: Extract<PasteIntent, { kind: "overlay" }>,
      pageSize: PageBounds,
    ) => {
      const { pasteCount, payloadKey } = getNextOverlayPaste(intent.payload);
      const input = toOverlayInput(intent.payload, {
        pageNumber: currentPage,
        pageSize,
        pasteCount,
      });
      let renderableInput = input;
      let additionalRenderableImageAssetIds: string[] | undefined;

      if (input.type === "image") {
        const existingAsset = imageAssets.find(
          (asset) => asset.id === input.assetId,
        );

        if (!existingAsset) {
          if (!intent.imageBlob) {
            toast.error("Unable to paste image overlay", {
              description: "The copied image data is not available.",
            });
            return;
          }

          const asset = await addImageBlob(intent.imageBlob);

          renderableInput = {
            ...input,
            assetId: asset.id,
            sha256Signature: asset.sha256Signature,
          };
          additionalRenderableImageAssetIds = [asset.id];
        }
      }

      const overlay = addRenderableOverlay(
        renderableInput,
        additionalRenderableImageAssetIds
          ? { additionalRenderableImageAssetIds }
          : undefined,
      );

      if (overlay) {
        setLastOverlayPaste({ pasteCount, payloadKey });
      }
    },
    [
      addImageBlob,
      addRenderableOverlay,
      currentPage,
      getNextOverlayPaste,
      imageAssets,
    ],
  );

  const pasteExternalTextIntent = useCallback(
    (
      intent: Extract<PasteIntent, { kind: "external-text" }>,
      pageSize: PageBounds,
      textSettings: TextOverlayDefaults,
    ) => {
      const signature = intent.html
        ? createTextClipboardSignature("text/html", intent.html)
        : createTextClipboardSignature("text/plain", intent.text);

      if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
        return;
      }

      const input = intent.html
        ? textOverlayInputFromHtml(intent.html, intent.text, {
            pageNumber: currentPage,
            pageSize,
            textSettings,
          })
        : textOverlayInputFromPlainText(intent.text, {
            pageNumber: currentPage,
            pageSize,
            textSettings,
          });

      if (!input) {
        return;
      }

      const overlay = addRenderableOverlay(input);

      if (overlay) {
        setLastExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    },
    [addRenderableOverlay, currentPage, lastExternalPaste, overlays],
  );

  const pasteTextWithCurrentSettingsIntent = useCallback(
    (
      intent: PasteIntent,
      pageSize: PageBounds,
      textSettings: TextOverlayDefaults,
    ) => {
      const text =
        intent.kind === "overlay" && intent.payload.overlay.type === "text"
          ? intent.payload.overlay.text
          : intent.kind === "external-text"
            ? intent.html
              ? extractPlainTextFromHtml(intent.html) || intent.text
              : intent.text
            : "";

      if (!text) {
        return;
      }

      const signature = createTextClipboardSignature("text/plain", text);

      if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
        return;
      }

      const input = textOverlayInputUsingCurrentSettings(text, {
        pageNumber: currentPage,
        pageSize,
        textSettings,
      });

      if (!input) {
        return;
      }

      const overlay = addRenderableOverlay(input);

      if (overlay) {
        setLastExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    },
    [addRenderableOverlay, currentPage, lastExternalPaste, overlays],
  );

  const handlePasteIntent = useCallback(
    (intent: PasteIntent) => {
      const pageSize = getCurrentPageSize();

      if (!pageSize || intent.kind === "empty") {
        return;
      }

      const paste = async () => {
        try {
          if (intent.kind === "overlay") {
            await pasteOverlayIntent(intent, pageSize);
            return;
          }

          if (intent.kind === "external-image") {
            await addPastedImageOverlay(intent.blob, pageSize);
            return;
          }

          pasteExternalTextIntent(intent, pageSize, getCurrentTextDefaults());
        } catch (error) {
          toast.error("Unable to paste", {
            description:
              error instanceof Error
                ? error.message
                : "Copy another item and try again.",
          });
        }
      };

      void paste();
    },
    [
      addPastedImageOverlay,
      getCurrentPageSize,
      getCurrentTextDefaults,
      pasteExternalTextIntent,
      pasteOverlayIntent,
    ],
  );

  const handlePasteEvent = useCallback(
    (event: ClipboardEvent) => {
      const intent = readPasteIntentFromClipboardData(event.clipboardData);

      if (intent.kind === "empty") {
        return;
      }

      event.preventDefault();
      handlePasteIntent(intent);
    },
    [handlePasteIntent],
  );

  const handlePasteWithCurrentTextSettings = useCallback(() => {
    const pageSize = getCurrentPageSize();

    if (!pageSize) {
      return;
    }

    const paste = async () => {
      const intent = await readPasteIntentFromAsyncClipboard();

      pasteTextWithCurrentSettingsIntent(
        intent,
        pageSize,
        getCurrentTextDefaults(),
      );
    };

    void paste();
  }, [
    getCurrentPageSize,
    getCurrentTextDefaults,
    pasteTextWithCurrentSettingsIntent,
  ]);

  return {
    clearClipboardHistory,
    handleCopySelectedOverlay,
    handleDuplicateSelectedOverlay,
    handlePasteEvent,
    handlePasteWithCurrentTextSettings,
  };
}

function createTextClipboardSignature(type: string, text: string) {
  return `${type}:${text}`;
}

function createImageClipboardSignature(
  mimeType: string,
  sha256Signature: string,
) {
  return `image:${mimeType}:${sha256Signature}`;
}

function createCenteredImageOverlayInput(
  asset: Pick<ImageAsset, "height" | "id" | "sha256Signature" | "width">,
  pageNumber: number,
  pageSize: PageBounds,
): EditorOverlayInput {
  return {
    assetId: asset.id,
    pageNumber,
    rect: createImageOverlayRectAtPoint(
      { x: pageSize.width / 2, y: pageSize.height / 2 },
      pageSize,
      asset,
    ),
    sha256Signature: asset.sha256Signature,
    type: "image",
  };
}

export { useEditorClipboardActions };
