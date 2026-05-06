import { describe, expect, it } from "vitest";

import {
  findCenteredPageNumber,
  getScrollTopForPage,
} from "@/features/editor/lib/page-scroll-utils";

describe("page-scroll-utils", () => {
  it("returns the page containing the viewport center", () => {
    expect(
      findCenteredPageNumber({
        fallbackPage: 1,
        pages: [
          { bottom: 500, pageNumber: 1, top: 0 },
          { bottom: 1100, pageNumber: 2, top: 600 },
        ],
        viewportHeight: 400,
        viewportTop: 650,
      }),
    ).toBe(2);
  });

  it("returns the closest page when the viewport center is in a gap", () => {
    expect(
      findCenteredPageNumber({
        fallbackPage: 1,
        pages: [
          { bottom: 500, pageNumber: 1, top: 0 },
          { bottom: 1100, pageNumber: 2, top: 600 },
        ],
        viewportHeight: 100,
        viewportTop: 500,
      }),
    ).toBe(1);
  });

  it("keeps previous page when no page bounds exist", () => {
    expect(
      findCenteredPageNumber({
        fallbackPage: 3,
        pages: [],
        viewportHeight: 500,
        viewportTop: 0,
      }),
    ).toBe(3);
  });

  it("calculates scrollTop needed to place page below top spacing", () => {
    expect(
      getScrollTopForPage({
        containerScrollTop: 300,
        containerTop: 100,
        pageTop: 450,
        topSpacing: 24,
      }),
    ).toBe(626);
  });

  it("does not return negative scrollTop", () => {
    expect(
      getScrollTopForPage({
        containerScrollTop: 10,
        containerTop: 100,
        pageTop: 90,
        topSpacing: 24,
      }),
    ).toBe(0);
  });
});
