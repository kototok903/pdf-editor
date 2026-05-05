import { describe, expect, it } from "vitest";

import { createExportFileName } from "@/features/pdf-export/lib/export-file-name";

describe("createExportFileName", () => {
  it("uses the original file name when it has not been exported in this session", () => {
    expect(createExportFileName("form.pdf", new Set())).toBe("form.pdf");
  });

  it("adds a number when the original name is already taken", () => {
    expect(createExportFileName("form.pdf", new Set(["form.pdf"]))).toBe(
      "form (1).pdf",
    );
  });

  it("increments from an existing numbered suffix", () => {
    expect(
      createExportFileName("form (3).pdf", new Set(["form (3).pdf"])),
    ).toBe("form (4).pdf");
  });

  it("skips taken numbered names", () => {
    expect(
      createExportFileName(
        "form.pdf",
        new Set(["form.pdf", "form (1).pdf", "form (2).pdf"]),
      ),
    ).toBe("form (3).pdf");
  });
});
