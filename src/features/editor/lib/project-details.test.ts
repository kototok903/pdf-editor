import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import { createEditorHistory } from "@/features/editor/lib/editor-history";
import type { Project } from "@/features/editor/lib/editor-projects";
import {
  formatByteSize,
  getEditedPageCount,
  getProjectDetails,
} from "@/features/editor/lib/project-details";

function createTextOverlay(id: string, pageNumber: number): EditorOverlay {
  return {
    color: "#111827",
    fontId: "helvetica",
    fontSize: 16,
    id,
    pageNumber,
    rect: {
      height: 24,
      width: 120,
      x: 10,
      y: 10,
    },
    text: "Text",
    type: "text",
  };
}

function createTestProject(overlays: EditorOverlay[]): Project {
  return {
    createdAt: 100,
    currentPage: 1,
    fileName: "form.pdf",
    history: createEditorHistory(overlays),
    id: "project-a",
    lastModifiedAt: 200,
    pageCount: 4,
    pdfBytes: new Uint8Array(1536).buffer,
  };
}

describe("project details", () => {
  it("formats small byte counts without a larger unit", () => {
    expect(formatByteSize(0)).toBe("0 bytes");
    expect(formatByteSize(1)).toBe("1 byte");
    expect(formatByteSize(512)).toBe("512 bytes");
  });

  it("formats larger byte counts with a readable unit and exact bytes", () => {
    const formatted = formatByteSize(1536);

    expect(formatted).toContain("KB");
    expect(formatted).toContain("1.5");
    expect(formatted).toMatch(/\(1,?536 bytes\)/);
  });

  it("counts pages with at least one overlay", () => {
    expect(
      getEditedPageCount([
        createTextOverlay("text-1", 1),
        createTextOverlay("text-2", 1),
        createTextOverlay("text-3", 3),
      ]),
    ).toBe(2);
  });

  it("builds project details from the current history entry", () => {
    const project = createTestProject([
      createTextOverlay("text-1", 1),
      createTextOverlay("text-2", 4),
    ]);

    expect(getProjectDetails(project)).toMatchObject({
      layerCount: 2,
      pagesEdited: 2,
    });
    expect(getProjectDetails(project).originalSize).toContain("KB");
  });
});
