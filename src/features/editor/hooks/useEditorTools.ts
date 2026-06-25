import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { SignatureCreateInput } from "@/features/editor/components/SignatureCreateDialog";
import type {
  DocumentPage,
  EditorOverlay,
  EditorOverlayInput,
  ImageAsset,
  MarkOverlay,
  PdfRect,
  TextOverlayDefaults,
  WhiteoutOverlayDefaults,
} from "@/features/editor/editor-types";
import { readPasteIntentFromAsyncClipboard } from "@/features/editor/lib/editor-clipboard";
import { getPageIdForVisiblePage } from "@/features/editor/lib/document-pages";
import { supportedImageTypeListLabel } from "@/features/editor/lib/image-asset-utils";
import { createImageOverlayRectAtPoint } from "@/features/editor/lib/overlay-coordinate-utils";
import { getSignatureFontOption } from "@/features/editor/lib/signature-fonts";
import { rasterizeTypedSignature } from "@/features/editor/lib/signature-rasterizer";

type ActiveTool =
  | { type: "image"; assetId: string }
  | { type: "mark" }
  | { type: "signature"; assetId: string }
  | { type: "text" }
  | { type: "whiteout" }
  | null;

type UseEditorToolsOptions = {
  addImageBlob: (blob: Blob) => Promise<ImageAsset>;
  addImageFile: (file: File) => Promise<ImageAsset>;
  addImageUrl: (url: string) => Promise<ImageAsset>;
  addOverlay: (input: EditorOverlayInput) => EditorOverlay;
  addSignatureBlob: (blob: Blob, fileName: string) => Promise<ImageAsset>;
  currentPage: number;
  documentPages: DocumentPage[];
  editOverlay: (overlayId: string | null) => void;
  getCurrentPageSize: () => { height: number; width: number } | null;
  imageAssets: ImageAsset[];
  markDefaults: Pick<MarkOverlay, "color" | "markType">;
  setCurrentPage: (pageNumber: number) => void;
  showImageAssetInRecents: (assetId: string) => void;
  textDefaults: TextOverlayDefaults;
  whiteoutDefaults: WhiteoutOverlayDefaults;
};

function useEditorTools({
  addImageBlob,
  addImageFile,
  addImageUrl,
  addOverlay,
  addSignatureBlob,
  currentPage,
  documentPages,
  editOverlay,
  getCurrentPageSize,
  imageAssets,
  markDefaults,
  setCurrentPage,
  showImageAssetInRecents,
  textDefaults,
  whiteoutDefaults,
}: UseEditorToolsOptions) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const activeImageAsset = useMemo(
    () =>
      activeTool?.type === "image"
        ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
        : null,
    [activeTool, imageAssets],
  );
  const activeSignatureAsset = useMemo(
    () =>
      activeTool?.type === "signature"
        ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
        : null,
    [activeTool, imageAssets],
  );

  const clearActiveTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  const resetActiveTool = clearActiveTool;
  const getOverlayPageId = useCallback(
    (pageNumber: number) => getPageIdForVisiblePage(documentPages, pageNumber),
    [documentPages],
  );

  const addRenderableOverlay = useCallback(
    (
      input: EditorOverlayInput,
      options?: { additionalRenderableImageAssetIds?: string[] },
    ) => {
      if (
        (input.type === "image" || input.type === "signature") &&
        !imageAssets.some((asset) => asset.id === input.assetId) &&
        !options?.additionalRenderableImageAssetIds?.includes(input.assetId)
      ) {
        return null;
      }

      setActiveTool(null);
      editOverlay(null);

      if (input.type === "image" || input.type === "signature") {
        showImageAssetInRecents(input.assetId);
      }

      return addOverlay(input);
    },
    [addOverlay, editOverlay, imageAssets, showImageAssetInRecents],
  );

  const activateImageAsset = useCallback(
    (assetId: string) => {
      showImageAssetInRecents(assetId);
      setActiveTool({ assetId, type: "image" });
      editOverlay(null);
    },
    [editOverlay, showImageAssetInRecents],
  );

  const activateSignatureAsset = useCallback(
    (assetId: string) => {
      showImageAssetInRecents(assetId);
      setActiveTool({ assetId, type: "signature" });
      editOverlay(null);
    },
    [editOverlay, showImageAssetInRecents],
  );

  const importImageFile = useCallback(
    async (file: File) => {
      const asset = await addImageFile(file);

      setActiveTool({ assetId: asset.id, type: "image" });
      editOverlay(null);
    },
    [addImageFile, editOverlay],
  );

  const importImageUrl = useCallback(
    async (url: string) => {
      const asset = await addImageUrl(url);

      setActiveTool({ assetId: asset.id, type: "image" });
      editOverlay(null);
    },
    [addImageUrl, editOverlay],
  );

  const createSignature = useCallback(
    async (input: SignatureCreateInput) => {
      try {
        const signatureBlob =
          input.type === "typed"
            ? await rasterizeTypedSignature({
                color: input.color,
                font: getSignatureFontOption(input.fontId),
                text: input.text,
              }).then(({ blob }) => blob)
            : input.blob;
        const signatureName =
          input.type === "typed" ? `${input.text}.png` : "Signature.png";
        const asset = await addSignatureBlob(signatureBlob, signatureName);

        setActiveTool({ assetId: asset.id, type: "signature" });
        editOverlay(null);
        toast.success("Created signature", {
          description: "Click a page to place it.",
        });

        return true;
      } catch (error) {
        toast.error("Unable to create signature", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });

        return false;
      }
    },
    [addSignatureBlob, editOverlay],
  );

  const importImageFromClipboard = useCallback(() => {
    const importImage = async () => {
      try {
        const intent = await readPasteIntentFromAsyncClipboard();
        const blob =
          intent.kind === "external-image"
            ? intent.blob
            : intent.kind === "overlay"
              ? intent.imageBlob
              : null;

        if (!blob) {
          toast.error("Copy an image and try again", {
            description: `Supported types: ${supportedImageTypeListLabel}`,
          });
          return;
        }

        const asset = await addImageBlob(blob);

        setActiveTool({ assetId: asset.id, type: "image" });
        editOverlay(null);
      } catch (error) {
        toast.error("Unable to read clipboard", {
          description:
            error instanceof Error
              ? error.message
              : "Allow clipboard access and try again.",
        });
      }
    };

    void importImage();
  }, [addImageBlob, editOverlay]);

  const dropImageFile = useCallback(
    (file: File) => {
      const pageSize = getCurrentPageSize();

      if (!pageSize) {
        toast.error("Unable to place image", {
          description: "Open a PDF and wait for the page to finish rendering.",
        });
        return;
      }

      const importAndPlaceImage = async () => {
        const pageId = getOverlayPageId(currentPage);

        if (!pageId) {
          return;
        }

        try {
          const asset = await addImageFile(file);

          addRenderableOverlay(
            {
              assetId: asset.id,
              pageId,
              rect: createImageOverlayRectAtPoint(
                { x: pageSize.width / 2, y: pageSize.height / 2 },
                pageSize,
                asset,
              ),
              rotationDegrees: 0,
              sha256Signature: asset.sha256Signature,
              type: "image",
            },
            { additionalRenderableImageAssetIds: [asset.id] },
          );
        } catch (error) {
          toast.error("Unable to import image", {
            description:
              error instanceof Error
                ? error.message
                : "Please try another image file.",
          });
        }
      };

      void importAndPlaceImage();
    },
    [
      addImageFile,
      addRenderableOverlay,
      currentPage,
      getCurrentPageSize,
      getOverlayPageId,
    ],
  );

  const toggleTextTool = useCallback(() => {
    setActiveTool((currentTool) =>
      currentTool?.type === "text" ? null : { type: "text" },
    );
    editOverlay(null);
  }, [editOverlay]);

  const toggleMarkTool = useCallback(() => {
    setActiveTool((currentTool) =>
      currentTool?.type === "mark" ? null : { type: "mark" },
    );
    editOverlay(null);
  }, [editOverlay]);

  const activateMarkTool = useCallback(() => {
    setActiveTool({ type: "mark" });
    editOverlay(null);
  }, [editOverlay]);

  const toggleWhiteoutTool = useCallback(() => {
    setActiveTool((currentTool) =>
      currentTool?.type === "whiteout" ? null : { type: "whiteout" },
    );
    editOverlay(null);
  }, [editOverlay]);

  const placeTextOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      const pageId = getOverlayPageId(pageNumber);

      if (!pageId) {
        return;
      }

      setCurrentPage(pageNumber);
      const overlay = addOverlay({
        ...textDefaults,
        pageId,
        rect,
        type: "text",
      });

      setActiveTool(null);
      editOverlay(overlay.id);
    },
    [addOverlay, editOverlay, getOverlayPageId, setCurrentPage, textDefaults],
  );

  const placeMarkOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      const pageId = getOverlayPageId(pageNumber);

      if (!pageId) {
        return;
      }

      setCurrentPage(pageNumber);
      addOverlay({
        ...markDefaults,
        pageId,
        rect,
        type: "mark",
      });
      setActiveTool(null);
      editOverlay(null);
    },
    [addOverlay, editOverlay, getOverlayPageId, markDefaults, setCurrentPage],
  );

  const placeImageOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      if (!activeImageAsset) {
        return;
      }
      const pageId = getOverlayPageId(pageNumber);

      if (!pageId) {
        return;
      }

      setCurrentPage(pageNumber);
      addOverlay({
        assetId: activeImageAsset.id,
        pageId,
        rect,
        rotationDegrees: 0,
        sha256Signature: activeImageAsset.sha256Signature,
        type: "image",
      });
      setActiveTool(null);
      editOverlay(null);
    },
    [
      activeImageAsset,
      addOverlay,
      editOverlay,
      getOverlayPageId,
      setCurrentPage,
    ],
  );

  const placeSignatureOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      if (!activeSignatureAsset) {
        return;
      }
      const pageId = getOverlayPageId(pageNumber);

      if (!pageId) {
        return;
      }

      setCurrentPage(pageNumber);
      addOverlay({
        assetId: activeSignatureAsset.id,
        pageId,
        rect,
        rotationDegrees: 0,
        sha256Signature: activeSignatureAsset.sha256Signature,
        type: "signature",
      });
      setActiveTool(null);
      editOverlay(null);
    },
    [
      activeSignatureAsset,
      addOverlay,
      editOverlay,
      getOverlayPageId,
      setCurrentPage,
    ],
  );

  const placeWhiteoutOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      const pageId = getOverlayPageId(pageNumber);

      if (!pageId) {
        return;
      }

      setCurrentPage(pageNumber);
      addOverlay({
        color: whiteoutDefaults.color,
        pageId,
        rect,
        type: "whiteout",
      });
      setActiveTool(null);
      editOverlay(null);
    },
    [
      addOverlay,
      editOverlay,
      getOverlayPageId,
      setCurrentPage,
      whiteoutDefaults.color,
    ],
  );

  return {
    activeImageAsset,
    activeSignatureAsset,
    activeTool,
    activateImageAsset,
    activateMarkTool,
    activateSignatureAsset,
    addRenderableOverlay,
    clearActiveTool,
    createSignature,
    dropImageFile,
    importImageFile,
    importImageFromClipboard,
    importImageUrl,
    placeImageOverlay,
    placeMarkOverlay,
    placeSignatureOverlay,
    placeTextOverlay,
    placeWhiteoutOverlay,
    resetActiveTool,
    toggleMarkTool,
    toggleTextTool,
    toggleWhiteoutTool,
  };
}

export { useEditorTools, type ActiveTool };
