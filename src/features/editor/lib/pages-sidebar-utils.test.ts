import { describe, expect, it } from "vitest";

import { getSidebarThumbnailRenderPages } from "@/features/editor/lib/pages-sidebar-utils";

describe("getSidebarThumbnailRenderPages", () => {
  it("combines currently intersecting pages with a bounded current-page window", () => {
    const pages = getSidebarThumbnailRenderPages({
      currentPage: 10,
      intersectingPages: new Set([1, 2, 50]),
      overscan: 2,
      pageCount: 100,
    });

    expect([...pages].sort((left, right) => left - right)).toEqual([
      1, 2, 8, 9, 10, 11, 12, 50,
    ]);
  });

  it("does not keep invalid or out-of-range intersecting pages", () => {
    const pages = getSidebarThumbnailRenderPages({
      currentPage: 1,
      intersectingPages: new Set([0, 3, 8]),
      overscan: 2,
      pageCount: 5,
    });

    expect([...pages].sort((left, right) => left - right)).toEqual([1, 2, 3]);
  });
});
