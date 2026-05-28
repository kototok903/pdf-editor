import { describe, expect, it } from "vitest";

import {
  createProjectPath,
  getProjectIdFromPath,
  isProjectPath,
} from "@/features/editor/lib/project-route-utils";

describe("project route utils", () => {
  it("creates URL-safe project paths", () => {
    expect(createProjectPath("abc_123-xy")).toBe("/projects/abc_123-xy");
    expect(createProjectPath("project id")).toBe("/projects/project%20id");
  });

  it("reads project ids from project paths", () => {
    expect(getProjectIdFromPath("/projects/abc_123-xy")).toBe("abc_123-xy");
    expect(getProjectIdFromPath("/projects/project%20id")).toBe("project id");
    expect(getProjectIdFromPath("/projects/abc_123-xy/")).toBe("abc_123-xy");
  });

  it("ignores non-project paths and nested project paths", () => {
    expect(getProjectIdFromPath("/")).toBeNull();
    expect(getProjectIdFromPath("/projects")).toBeNull();
    expect(getProjectIdFromPath("/projects/one/two")).toBeNull();
  });

  it("detects project path requests", () => {
    expect(isProjectPath("/projects")).toBe(true);
    expect(isProjectPath("/projects/abc")).toBe(true);
    expect(isProjectPath("/")).toBe(false);
  });
});
