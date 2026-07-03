import { useEffect, useMemo, useRef, useState } from "react";

import type { DocumentPage } from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";
import {
  countPdfSearchMatches,
  createPdfSearchKey,
  createSearchablePageGroups,
} from "@/features/pdf-search/lib/pdf-search-utils";
import type {
  PdfSearchOptions,
  PdfSearchPageGroup,
} from "@/features/pdf-search/pdf-search-types";

type UsePdfSearchInput = {
  documentPages: readonly DocumentPage[];
  options: PdfSearchOptions;
  query: string;
  sourceDocumentsById: ReadonlyMap<string, LoadedPdfDocument>;
};

type ExtractedPageText = {
  pageNumber: number;
  sourceId: string;
  sourcePageNumber: number;
  text: string;
  textContentItemsStr: string[];
};

type PdfTextContentItem = {
  hasEOL?: boolean;
  str?: string;
};

type ExtractedTextCacheEntry = {
  text: string;
  textContentItemsStr: string[];
};

const searchDebounceMs = 200;

export function usePdfSearch({
  documentPages,
  options,
  query,
  sourceDocumentsById,
}: UsePdfSearchInput) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [groups, setGroups] = useState<PdfSearchPageGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const extractedTextCacheRef = useRef<Map<string, ExtractedTextCacheEntry>>(
    new Map(),
  );
  const requestIdRef = useRef(0);
  const lastSearchKeyRef = useRef<string | null>(null);
  const documentSignature = useMemo(
    () =>
      documentPages
        .map(
          (page, index) =>
            `${index + 1}:${page.id}:${page.sourceId}:${page.sourcePageNumber}`,
        )
        .join("|"),
    [documentPages],
  );
  const resultCount = useMemo(() => countPdfSearchMatches(groups), [groups]);

  useEffect(() => {
    if (!query.trim()) {
      requestIdRef.current += 1;
      lastSearchKeyRef.current = null;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, searchDebounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    extractedTextCacheRef.current = new Map();
    lastSearchKeyRef.current = null;
  }, [sourceDocumentsById]);

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim();

    if (!normalizedQuery) {
      requestIdRef.current += 1;
      lastSearchKeyRef.current = null;
      return;
    }

    const searchKey = createPdfSearchKey({
      documentSignature,
      options,
      query: normalizedQuery,
    });

    if (lastSearchKeyRef.current === searchKey) {
      return;
    }

    lastSearchKeyRef.current = searchKey;
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setIsSearching(true);

    async function runSearch() {
      const extractedPages: ExtractedPageText[] = [];

      for (const [index, documentPage] of documentPages.entries()) {
        const sourceDocument = sourceDocumentsById.get(documentPage.sourceId);

        if (!sourceDocument) {
          continue;
        }

        const pageNumber = index + 1;
        const sourcePageNumber = documentPage.sourcePageNumber;
        const cacheKey = createExtractedTextCacheKey({
          sourceId: documentPage.sourceId,
          sourcePageNumber,
        });
        const cachedEntry = extractedTextCacheRef.current.get(cacheKey);
        const extractedEntry =
          cachedEntry ??
          (await extractPageText({
            sourceDocument,
            sourcePageNumber,
          }));

        if (requestIdRef.current !== requestId) {
          return;
        }

        if (cachedEntry === undefined) {
          extractedTextCacheRef.current.set(cacheKey, extractedEntry);
        }

        extractedPages.push({
          pageNumber,
          sourceId: documentPage.sourceId,
          sourcePageNumber,
          text: extractedEntry.text,
          textContentItemsStr: extractedEntry.textContentItemsStr,
        });
      }

      if (requestIdRef.current !== requestId) {
        return;
      }

      setGroups(
        createSearchablePageGroups({
          options,
          pages: extractedPages,
          query: normalizedQuery,
        }),
      );
      setIsSearching(false);
    }

    void runSearch().catch(() => {
      if (requestIdRef.current === requestId) {
        setGroups([]);
        setIsSearching(false);
      }
    });
  }, [
    debouncedQuery,
    documentPages,
    documentSignature,
    options,
    sourceDocumentsById,
  ]);

  return {
    groups: query.trim() ? groups : [],
    isSearching: query.trim() ? isSearching : false,
    resultCount: query.trim() ? resultCount : 0,
  };
}

async function extractPageText({
  sourceDocument,
  sourcePageNumber,
}: {
  sourceDocument: LoadedPdfDocument;
  sourcePageNumber: number;
}) {
  const page = await sourceDocument.pdfDocument.getPage(sourcePageNumber);
  const textContent = await page.getTextContent({
    disableNormalization: true,
    includeMarkedContent: true,
  });
  const textContentItemsStr: string[] = [];

  for (const item of textContent.items) {
    if (!isPdfTextContentItem(item)) {
      continue;
    }

    textContentItemsStr.push(item.str ?? "");
  }

  return {
    text: textContentItemsStr.join(""),
    textContentItemsStr,
  };
}

function createExtractedTextCacheKey({
  sourceId,
  sourcePageNumber,
}: {
  sourceId: string;
  sourcePageNumber: number;
}) {
  return `${sourceId}:${sourcePageNumber}`;
}

function isPdfTextContentItem(value: unknown): value is PdfTextContentItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "str" in value &&
    typeof value.str === "string"
  );
}
