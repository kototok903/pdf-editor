export type PdfSearchOptions = {
  matchCase: boolean;
  wholeWord: boolean;
};

export type PdfSearchSnippetPart = {
  isMatch: boolean;
  text: string;
};

export type PdfSearchTextPosition = {
  divIndex: number;
  offset: number;
};

export type PdfSearchTextRange = {
  begin: PdfSearchTextPosition;
  end: PdfSearchTextPosition;
};

export type PdfSearchMatch = {
  id: string;
  length: number;
  matchIndexOnPage: number;
  pageNumber: number;
  range: PdfSearchTextRange;
  snippetParts: PdfSearchSnippetPart[];
  sourceId: string;
  sourcePageNumber: number;
  start: number;
};

export type PdfSearchPageGroup = {
  matches: PdfSearchMatch[];
  pageNumber: number;
};
