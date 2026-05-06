import { afterEach, describe, expect, it, vi } from "vitest";

import type { ImageAsset } from "@/features/editor/editor-types";
import {
  imageAssetFromPersistedRecord,
  toPersistedImageAssetRecord,
} from "@/features/editor/lib/persisted-image-assets";

const originalCreateObjectUrl = URL.createObjectURL;

function createImageAsset(patch: Partial<ImageAsset> = {}): ImageAsset {
  return {
    bytes: new Uint8Array([1, 2, 3]).buffer,
    formatLabel: "PNG",
    height: 80,
    id: "image-1",
    isHiddenFromRecents: false,
    mimeType: "image/png",
    name: "image.png",
    objectUrl: "blob:runtime-url",
    sha256Signature: "abc123",
    source: "upload",
    width: 120,
    ...patch,
  };
}

afterEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: originalCreateObjectUrl,
  });
});

describe("persisted image assets", () => {
  it("converts runtime assets to durable records without object URLs", () => {
    const record = toPersistedImageAssetRecord(createImageAsset(), 123);

    expect(record).toEqual({
      bytes: expect.any(ArrayBuffer),
      createdAt: 123,
      formatLabel: "PNG",
      height: 80,
      id: "image-1",
      isHiddenFromRecents: false,
      lastUsedAt: 123,
      mimeType: "image/png",
      name: "image.png",
      sha256Signature: "abc123",
      source: "upload",
      width: 120,
    });
    expect("objectUrl" in record).toBe(false);
  });

  it("recreates runtime assets with a fresh object URL", () => {
    const createObjectUrl = vi.fn(() => "blob:restored-url");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });

    const restoredAsset = imageAssetFromPersistedRecord({
      ...toPersistedImageAssetRecord(createImageAsset(), 123),
      lastUsedAt: 456,
    });

    expect(restoredAsset).toEqual({
      ...createImageAsset(),
      objectUrl: "blob:restored-url",
    });
    expect(createObjectUrl).toHaveBeenCalledOnce();
  });
});
