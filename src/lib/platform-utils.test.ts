import { describe, expect, it } from "vitest";

import {
  detectMobile,
  detectPlatform,
  getPlatformInfo,
  getPlatformSymbols,
} from "@/lib/platform-utils";

describe("platform utils", () => {
  it("detects desktop platforms from user agent strings", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      ),
    ).toBe("mac");
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "windows",
    );
    expect(detectPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
    expect(detectPlatform("")).toBe("unknown");
  });

  it("detects mobile user agents", () => {
    expect(detectMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(true);
    expect(detectMobile("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(true);
    expect(
      detectMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
    ).toBe(false);
  });

  it("returns platform info for an explicit user agent", () => {
    expect(
      getPlatformInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
    ).toEqual({
      isMobile: false,
      platform: "windows",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  });

  it("uses command as the mod symbol on mac and control elsewhere", () => {
    expect(getPlatformSymbols("mac").mod).toBe("⌘");
    expect(getPlatformSymbols("windows").mod).toBe("Ctrl");
    expect(getPlatformSymbols("linux").mod).toBe("Ctrl");
    expect(getPlatformSymbols("unknown").mod).toBe("Ctrl");
  });
});
