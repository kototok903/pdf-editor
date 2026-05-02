import { useCallback, useEffect, useRef, useState } from "react";

import type { ImageAsset } from "@/features/editor/editor-types";
import {
  createImageAssetFromFile,
  createImageAssetFromUrl,
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
    const asset = await createImageAssetFromFile(file);

    setImageAssets((currentAssets) => [asset, ...currentAssets]);

    return asset;
  }, []);

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
    addImageFile,
    addImageUrl,
    hideImageAssetFromRecents,
    imageAssets,
    recentImageAssets,
  };
}

export { useImageAssets };
