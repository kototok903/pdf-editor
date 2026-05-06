import type { ImageAsset } from "@/features/editor/editor-types";
import type { PersistedImageAssetRecord } from "@/features/editor/lib/editor-draft-db";

function toPersistedImageAssetRecord(
  asset: ImageAsset,
  now = Date.now(),
): PersistedImageAssetRecord {
  return {
    bytes: asset.bytes,
    createdAt: now,
    formatLabel: asset.formatLabel,
    height: asset.height,
    id: asset.id,
    isHiddenFromRecents: asset.isHiddenFromRecents,
    lastUsedAt: now,
    mimeType: asset.mimeType,
    name: asset.name,
    sha256Signature: asset.sha256Signature,
    source: asset.source,
    width: asset.width,
  };
}

function imageAssetFromPersistedRecord(
  record: PersistedImageAssetRecord,
): ImageAsset {
  const blob = new Blob([new Uint8Array(record.bytes)], {
    type: record.mimeType,
  });

  return {
    bytes: record.bytes,
    formatLabel: record.formatLabel,
    height: record.height,
    id: record.id,
    isHiddenFromRecents: record.isHiddenFromRecents,
    mimeType: record.mimeType,
    name: record.name,
    objectUrl: URL.createObjectURL(blob),
    sha256Signature: record.sha256Signature,
    source: record.source,
    width: record.width,
  };
}

export { imageAssetFromPersistedRecord, toPersistedImageAssetRecord };
