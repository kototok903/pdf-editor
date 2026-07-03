import { describe, expect, it } from "vitest";

import {
  countPdfSearchMatches,
  createPdfSearchKey,
  createSearchablePageGroups,
  createSearchSnippetParts,
  findTextMatches,
  normalizeSearchQuery,
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

  it("normalizes continuous query whitespace to one space", () => {
    expect(normalizeSearchQuery("  &  \n\tclaude  ")).toBe("& claude");
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
          rawIndexBySearchIndex: [0, 1, 2, 3, 4, 5],
          sourceId: "source-a",
          sourcePageNumber: 1,
          text: "No hit",
          textContentItemsStr: ["No hit"],
        },
        {
          pageNumber: 3,
          rawIndexBySearchIndex: [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
          ],
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

  it("keeps inserted searchable spaces out of highlight ranges", () => {
    const groups = createSearchablePageGroups({
      options: defaultOptions,
      pages: [
        {
          pageNumber: 1,
          rawIndexBySearchIndex: [0, 1, null, 2, 3],
          sourceId: "source-a",
          sourcePageNumber: 1,
          text: "A& C",
          textContentItemsStr: ["A&", "C"],
        },
      ],
      query: "& c",
    });

    expect(groups[0]?.matches[0]?.range).toEqual({
      begin: { divIndex: 0, offset: 1 },
      end: { divIndex: 1, offset: 1 },
    });
  });

  it("searches with normalized query whitespace", () => {
    const groups = createSearchablePageGroups({
      options: defaultOptions,
      pages: [
        {
          pageNumber: 1,
          rawIndexBySearchIndex: [0, 1, null, 2, 3, 4, 5, 6, 7],
          sourceId: "source-a",
          sourcePageNumber: 1,
          text: "A& Claude",
          textContentItemsStr: ["A&", "Claude"],
        },
      ],
      query: "&  claude",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.matches[0]?.snippetParts).toContainEqual({
      isMatch: true,
      text: "& Claude",
    });
    expect(groups[0]?.matches[0]?.range).toEqual({
      begin: { divIndex: 0, offset: 1 },
      end: { divIndex: 1, offset: 6 },
    });
  });

  it("dedupes search keys by normalized query whitespace", () => {
    const key = {
      documentSignature: "doc",
      options: defaultOptions,
    };

    expect(createPdfSearchKey({ ...key, query: "& claude" })).toBe(
      createPdfSearchKey({ ...key, query: "&  claude" }),
    );
  });
});
