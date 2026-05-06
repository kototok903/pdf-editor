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

  const replaceImageAssets = useCallback((nextAssets: ImageAsset[]) => {
    setImageAssets((currentAssets) => {
      revokeReplacedImageAssetObjectUrls(currentAssets, nextAssets);

      return dedupeImageAssets(nextAssets);
    });
  }, []);

  const upsertImageAssets = useCallback((nextAssets: ImageAsset[]) => {
    setImageAssets((currentAssets) => {
      const mergedAssets = dedupeImageAssets([...nextAssets, ...currentAssets]);

      revokeReplacedImageAssetObjectUrls(currentAssets, mergedAssets);

      return mergedAssets;
    });
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
    replaceImageAssets,
    recentImageAssets,
    upsertImageAssets,
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

function dedupeImageAssets(imageAssets: ImageAsset[]) {
  const seenSignatures = new Set<string>();
  const dedupedAssets: ImageAsset[] = [];

  for (const asset of imageAssets) {
    if (seenSignatures.has(asset.sha256Signature)) {
      URL.revokeObjectURL(asset.objectUrl);
      continue;
    }

    seenSignatures.add(asset.sha256Signature);
    dedupedAssets.push(asset);
  }

  return dedupedAssets;
}

function revokeReplacedImageAssetObjectUrls(
  currentAssets: ImageAsset[],
  nextAssets: ImageAsset[],
) {
  const nextObjectUrls = new Set(nextAssets.map((asset) => asset.objectUrl));

  for (const asset of currentAssets) {
    if (!nextObjectUrls.has(asset.objectUrl)) {
      URL.revokeObjectURL(asset.objectUrl);
    }
  }
}

export { useImageAssets };
