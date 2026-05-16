import { useEffect, useState } from "react";

import type { LoadedPdfDocument, PageSize } from "@/features/pdf/pdf-types";

const pageSizeScanBatchSize = 8;

function usePdfPageSizes(document: LoadedPdfDocument | null) {
  const [pageSizeState, setPageSizeState] = useState<{
    document: LoadedPdfDocument;
    pageSizes: Record<number, PageSize>;
  } | null>(null);

  useEffect(() => {
    if (!document) {
      return;
    }

    const activeDocument = document;
    let isCancelled = false;

    async function scanPageSizes() {
      for (
        let startPage = 1;
        startPage <= activeDocument.pageCount;
        startPage += pageSizeScanBatchSize
      ) {
        const endPage = Math.min(
          activeDocument.pageCount,
          startPage + pageSizeScanBatchSize - 1,
        );
        const batchPageNumbers = Array.from(
          { length: endPage - startPage + 1 },
          (_, index) => startPage + index,
        );

        const batchEntries = await Promise.all(
          batchPageNumbers.map(async (pageNumber) => {
            const page = await activeDocument.pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });

            return [
              pageNumber,
              { height: viewport.height, width: viewport.width },
            ] as const;
          }),
        );

        if (isCancelled) {
          return;
        }

        setPageSizeState((currentState) => ({
          document: activeDocument,
          pageSizes: {
            ...(currentState?.document === activeDocument
              ? currentState.pageSizes
              : {}),
            ...Object.fromEntries(batchEntries),
          },
        }));

        await yieldToBrowser();
      }
    }

    void scanPageSizes();

    return () => {
      isCancelled = true;
    };
  }, [document]);

  return pageSizeState?.document === document ? pageSizeState.pageSizes : {};
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export { usePdfPageSizes };
