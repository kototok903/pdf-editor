import { describe, expect, it } from "vitest";

import {
  createMarkSvgBlob,
  createMarkSvgMarkup,
} from "@/features/editor/lib/mark-definitions";

describe("mark definitions", () => {
  it("creates SVG markup for copied mark overlays", () => {
    const markup = createMarkSvgMarkup({
      color: "#ff0000",
      markType: "check",
    });

    expect(markup).toContain('stroke="#ff0000"');
    expect(markup).toContain("M6 17.5L12.5 24L26 8");
  });

  it("creates an SVG blob for copied mark overlays", () => {
    const blob = createMarkSvgBlob({
      color: "#111827",
      markType: "dot",
    });

    expect(blob.type).toBe("image/svg+xml");
  });

  it("escapes SVG attribute content", () => {
    expect(
      createMarkSvgMarkup({
        color: '"<>&',
        markType: "x",
      }),
    ).toContain('stroke="&quot;&lt;&gt;&amp;"');
  });
});
