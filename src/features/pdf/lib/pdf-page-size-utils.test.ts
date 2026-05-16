import { describe, expect, it } from "vitest";

import {
  isPageInRenderWindow,
  scalePageSize,
  scalePageSizes,
} from "@/features/pdf/lib/pdf-page-size-utils";

describe("pdf page size utils", () => {
  it("detects pages inside the current render window", () => {
    expect(
      isPageInRenderWindow({ currentPage: 10, overscan: 5, pageNumber: 5 }),
    ).toBe(true);
    expect(
      isPageInRenderWindow({ currentPage: 10, overscan: 5, pageNumber: 15 }),
    ).toBe(true);
    expect(
      isPageInRenderWindow({ currentPage: 10, overscan: 5, pageNumber: 16 }),
    ).toBe(false);
  });

  it("scales one page size without mutating the source", () => {
    const pageSize = { height: 800, width: 600 };

    expect(scalePageSize(pageSize, 1.25)).toEqual({
      height: 1000,
      width: 750,
    });
    expect(pageSize).toEqual({ height: 800, width: 600 });
  });

  it("scales a page size map", () => {
    expect(
      scalePageSizes(
        {
          1: { height: 800, width: 600 },
          2: { height: 400, width: 300 },
        },
        0.5,
      ),
    ).toEqual({
      1: { height: 400, width: 300 },
      2: { height: 200, width: 150 },
    });
  });
});
