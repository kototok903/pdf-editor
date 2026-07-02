export type PdfSearchOptions = {
  matchCase: boolean;
  wholeWord: boolean;
};

export type PdfSearchSnippetPart = {
  isMatch: boolean;
  text: string;
};

export type PdfSearchMatch = {
  id: string;
  length: number;
  matchIndexOnPage: number;
  pageNumber: number;
  snippetParts: PdfSearchSnippetPart[];
  sourceId: string;
  sourcePageNumber: number;
  start: number;
};

export type PdfSearchPageGroup = {
  matches: PdfSearchMatch[];
  pageNumber: number;
};
