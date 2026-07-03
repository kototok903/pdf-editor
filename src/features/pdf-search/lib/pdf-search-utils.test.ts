import { describe, expect, it } from "vitest";

import {
  countPdfSearchMatches,
  createSearchablePageGroups,
  createSearchSnippetParts,
  findTextMatches,
} from "@/features/pdf-search/lib/pdf-search-utils";

const defaultOptions = {
  matchCase: false,
  wholeWord: false,
};

describe("pdf search utils", () => {
  it("finds matches case-insensitively by default", () => {
    expect(findTextMatches("Common common", "common", defaultOptions)).toEqual([
      { length: 6, start: 0 },
      { length: 6, start: 7 },
    ]);
  });

  it("honors match case", () => {
    expect(
      findTextMatches("Common common", "common", {
        matchCase: true,
        wholeWord: false,
      }),
    ).toEqual([{ length: 6, start: 7 }]);
  });

  it("honors whole word boundaries", () => {
    expect(
      findTextMatches("cat catalog cat-cat scatter cat2 cat", "cat", {
        matchCase: false,
        wholeWord: true,
      }),
    ).toEqual([
      { length: 3, start: 0 },
      { length: 3, start: 12 },
      { length: 3, start: 16 },
      { length: 3, start: 33 },
    ]);
  });

  it("returns no matches for empty query", () => {
    expect(findTextMatches("text", "", defaultOptions)).toEqual([]);
  });

  it("creates snippets with ellipses when trimmed", () => {
    expect(
      createSearchSnippetParts({
        contextLength: 5,
        length: 6,
        start: 10,
        text: "The quick common phrase is here",
      }),
    ).toEqual([
      { isMatch: false, text: "... uick " },
      { isMatch: true, text: "common" },
      { isMatch: false, text: " phra ..." },
    ]);
  });

  it("groups matches by page", () => {
    const groups = createSearchablePageGroups({
      options: defaultOptions,
      pages: [
        {
          pageNumber: 1,
          sourceId: "source-a",
          sourcePageNumber: 1,
          text: "No hit",
          textContentItemsStr: ["No hit"],
        },
        {
          pageNumber: 3,
          sourceId: "source-a",
          sourcePageNumber: 3,
          text: "Common and common.",
          textContentItemsStr: ["Common and ", "common."],
        },
      ],
      query: "common",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.pageNumber).toBe(3);
    expect(groups[0]?.matches[0]?.range).toEqual({
      begin: { divIndex: 0, offset: 0 },
      end: { divIndex: 0, offset: 6 },
    });
    expect(groups[0]?.matches[1]?.range).toEqual({
      begin: { divIndex: 1, offset: 0 },
      end: { divIndex: 1, offset: 6 },
    });
    expect(countPdfSearchMatches(groups)).toBe(2);
  });
});
