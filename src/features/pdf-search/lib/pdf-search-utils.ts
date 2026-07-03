import type {
  PdfSearchMatch,
  PdfSearchOptions,
  PdfSearchPageGroup,
  PdfSearchSnippetPart,
  PdfSearchTextRange,
} from "@/features/pdf-search/pdf-search-types";

type SearchablePageText = {
  pageNumber: number;
  sourceId: string;
  sourcePageNumber: number;
  text: string;
  textContentItemsStr: string[];
};

type TextMatchRange = {
  length: number;
  start: number;
};

const defaultSnippetContextLength = 64;

export function createPdfSearchKey({
  documentSignature,
  options,
  query,
}: {
  documentSignature: string;
  options: PdfSearchOptions;
  query: string;
}) {
  return [
    documentSignature,
    query.trim(),
    options.matchCase ? "case" : "nocase",
    options.wholeWord ? "word" : "partial",
  ].join("\u001f");
}

export function createSearchablePageGroups({
  options,
  pages,
  query,
}: {
  options: PdfSearchOptions;
  pages: SearchablePageText[];
  query: string;
}): PdfSearchPageGroup[] {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  return pages
    .map((page) => {
      const matches = findTextMatches(page.text, normalizedQuery, options).map(
        (match, matchIndexOnPage): PdfSearchMatch => ({
          id: createPdfSearchMatchId({
            matchIndexOnPage,
            pageNumber: page.pageNumber,
            sourceId: page.sourceId,
            sourcePageNumber: page.sourcePageNumber,
            start: match.start,
          }),
          length: match.length,
          matchIndexOnPage,
          pageNumber: page.pageNumber,
          range: convertMatchToTextRange({
            length: match.length,
            start: match.start,
            textContentItemsStr: page.textContentItemsStr,
          }),
          snippetParts: createSearchSnippetParts({
            length: match.length,
            start: match.start,
            text: page.text,
          }),
          sourceId: page.sourceId,
          sourcePageNumber: page.sourcePageNumber,
          start: match.start,
        }),
      );

      return {
        matches,
        pageNumber: page.pageNumber,
      };
    })
    .filter((group) => group.matches.length > 0);
}

export function countPdfSearchMatches(groups: readonly PdfSearchPageGroup[]) {
  return groups.reduce((count, group) => count + group.matches.length, 0);
}

export function findTextMatches(
  text: string,
  query: string,
  options: PdfSearchOptions,
): TextMatchRange[] {
  if (!query) {
    return [];
  }

  const searchableText = options.matchCase ? text : text.toLocaleLowerCase();
  const searchableQuery = options.matchCase ? query : query.toLocaleLowerCase();
  const matches: TextMatchRange[] = [];
  let searchFromIndex = 0;

  while (searchFromIndex <= searchableText.length) {
    const matchStart = searchableText.indexOf(searchableQuery, searchFromIndex);

    if (matchStart === -1) {
      break;
    }

    const matchEnd = matchStart + searchableQuery.length;

    if (
      !options.wholeWord ||
      isWholeWordMatch(searchableText, matchStart, matchEnd)
    ) {
      matches.push({
        length: searchableQuery.length,
        start: matchStart,
      });
    }

    searchFromIndex = Math.max(matchEnd, matchStart + 1);
  }

  return matches;
}

export function createSearchSnippetParts({
  contextLength = defaultSnippetContextLength,
  length,
  start,
  text,
}: {
  contextLength?: number;
  length: number;
  start: number;
  text: string;
}): PdfSearchSnippetPart[] {
  const end = start + length;
  const snippetStart = Math.max(0, start - contextLength);
  const snippetEnd = Math.min(text.length, end + contextLength);
  const rawParts: PdfSearchSnippetPart[] = [
    {
      isMatch: false,
      text: `${snippetStart > 0 ? "... " : ""}${text.slice(snippetStart, start)}`,
    },
    {
      isMatch: true,
      text: text.slice(start, end),
    },
    {
      isMatch: false,
      text: `${text.slice(end, snippetEnd)}${snippetEnd < text.length ? " ..." : ""}`,
    },
  ];

  return rawParts
    .map((part) => ({
      ...part,
      text: normalizeSnippetWhitespace(part.text),
    }))
    .filter((part) => part.text.length > 0);
}

function createPdfSearchMatchId({
  matchIndexOnPage,
  pageNumber,
  sourceId,
  sourcePageNumber,
  start,
}: {
  matchIndexOnPage: number;
  pageNumber: number;
  sourceId: string;
  sourcePageNumber: number;
  start: number;
}) {
  return `${sourceId}:${sourcePageNumber}:${pageNumber}:${matchIndexOnPage}:${start}`;
}

export function convertMatchToTextRange({
  length,
  start,
  textContentItemsStr,
}: {
  length: number;
  start: number;
  textContentItemsStr: string[];
}): PdfSearchTextRange {
  let divIndex = 0;
  let divStartIndex = 0;
  const lastDivIndex = textContentItemsStr.length - 1;

  while (
    divIndex !== lastDivIndex &&
    start >= divStartIndex + textContentItemsStr[divIndex].length
  ) {
    divStartIndex += textContentItemsStr[divIndex].length;
    divIndex += 1;
  }

  const begin = {
    divIndex,
    offset: start - divStartIndex,
  };
  const endIndex = start + length;

  while (
    divIndex !== lastDivIndex &&
    endIndex > divStartIndex + textContentItemsStr[divIndex].length
  ) {
    divStartIndex += textContentItemsStr[divIndex].length;
    divIndex += 1;
  }

  return {
    begin,
    end: {
      divIndex,
      offset: endIndex - divStartIndex,
    },
  };
}

function isWholeWordMatch(text: string, start: number, end: number) {
  return !isWordCharacter(text[start - 1]) && !isWordCharacter(text[end]);
}

function isWordCharacter(character: string | undefined) {
  return character !== undefined && /[\p{L}\p{N}_]/u.test(character);
}

function normalizeSnippetWhitespace(text: string) {
  return text.replace(/\s+/g, " ");
}
