import { useCallback, useEffect, useRef, useState } from "react";

import type { ImageAsset } from "@/features/editor/editor-types";
import {
  createImageAssetFromClipboardBlob,
  createImageAssetFromFile,
  createImageAssetFromUrl,
  createImageSha256Signature,
} from "@/features/editor/lib/image-asset-utils";

function useImageAssets() {
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>([]);
  const imageAssetsRef = useRef<ImageAsset[]>([]);

  useEffect(() => {
    imageAssetsRef.current = imageAssets;
  }, [imageAssets]);

  useEffect(() => {
    return () => {
      for (const asset of imageAssetsRef.current) {
        URL.revokeObjectURL(asset.objectUrl);
      }
    };
  }, []);

  const addImageFile = useCallback(async (file: File) => {
    const sha256Signature = await createImageSha256Signature(file);
    const existingAsset = imageAssetsRef.current.find(
      (asset) => asset.sha256Signature === sha256Signature,
    );

    if (existingAsset) {
      setImageAssets((currentAssets) =>
        moveImageAssetToTop(currentAssets, existingAsset.id),
      );

      return existingAsset;
    }

    const asset = await createImageAssetFromFile(file, sha256Signature);

    setImageAssets((currentAssets) => [asset, ...currentAssets]);

    return asset;
  }, []);

  const addImageBlob = useCallback(
    async (blob: Blob, sha256Signature?: string) => {
      const nextSignature =
        sha256Signature ?? (await createImageSha256Signature(blob));
      const existingAsset = imageAssetsRef.current.find(
        (asset) => asset.sha256Signature === nextSignature,
      );

      if (existingAsset) {
        setImageAssets((currentAssets) =>
          moveImageAssetToTop(currentAssets, existingAsset.id),
        );

        return existingAsset;
      }

      const asset = await createImageAssetFromClipboardBlob(
        blob,
        nextSignature,
      );

      setImageAssets((currentAssets) => [asset, ...currentAssets]);

      return asset;
    },
    [],
  );

  const addImageUrl = useCallback(async (url: string) => {
    const asset = await createImageAssetFromUrl(url);

    setImageAssets((currentAssets) => [asset, ...currentAssets]);

    return asset;
  }, []);

  const hideImageAssetFromRecents = useCallback((assetId: string) => {
    setImageAssets((currentAssets) =>
      currentAssets.map((asset) =>
        asset.id === assetId ? { ...asset, isHiddenFromRecents: true } : asset,
      ),
    );
  }, []);

  const recentImageAssets = imageAssets.filter(
    (asset) => !asset.isHiddenFromRecents,
  );

  return {
    addImageBlob,
    addImageFile,
    addImageUrl,
    hideImageAssetFromRecents,
    imageAssets,
    recentImageAssets,
  };
}

function moveImageAssetToTop(imageAssets: ImageAsset[], assetId: string) {
  const asset = imageAssets.find((currentAsset) => currentAsset.id === assetId);

  if (!asset) {
    return imageAssets;
  }

  return [
    { ...asset, isHiddenFromRecents: false },
    ...imageAssets.filter((currentAsset) => currentAsset.id !== assetId),
  ];
}

export { useImageAssets };
