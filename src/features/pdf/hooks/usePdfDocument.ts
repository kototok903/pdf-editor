import { useCallback, useEffect, useRef, useState } from "react";

import { loadPdfDocument } from "@/features/pdf/lib/pdfjs";
import type {
  LoadedPdfDocument,
  PDFDocumentProxy,
  PdfLoadStatus,
} from "@/features/pdf/pdf-types";

type PdfDocumentState = {
  document: LoadedPdfDocument | null;
  error: string | null;
  status: PdfLoadStatus;
};

const initialState: PdfDocumentState = {
  document: null,
  error: null,
  status: "empty",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load this PDF.";
}

function usePdfDocument() {
  const [state, setState] = useState<PdfDocumentState>(initialState);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const loadIdRef = useRef(0);

  const destroyCurrentDocument = useCallback(() => {
    const currentDocument = documentRef.current;

    if (currentDocument) {
      void currentDocument.destroy();
      documentRef.current = null;
    }
  }, []);

  const clearFile = useCallback(() => {
    loadIdRef.current += 1;
    destroyCurrentDocument();
    setState(initialState);
  }, [destroyCurrentDocument]);

  const openBytes = useCallback(
    async (bytes: ArrayBuffer, fileName: string) => {
      const loadId = loadIdRef.current + 1;
      loadIdRef.current = loadId;
      destroyCurrentDocument();
      setState({ document: null, error: null, status: "loading" });

      try {
        const pdfDocument = await loadPdfDocument(bytes);

        if (loadIdRef.current !== loadId) {
          void pdfDocument.destroy();
          return null;
        }

        const loadedPdfDocument: LoadedPdfDocument = {
          bytes,
          fileName,
          pageCount: pdfDocument.numPages,
          pdfDocument,
        };

        documentRef.current = pdfDocument;
        setState({
          document: loadedPdfDocument,
          error: null,
          status: "loaded",
        });
        return loadedPdfDocument;
      } catch (error) {
        if (loadIdRef.current !== loadId) {
          return null;
        }

        setState({
          document: null,
          error: getErrorMessage(error),
          status: "error",
        });
        return null;
      }
    },
    [destroyCurrentDocument],
  );

  const openFile = useCallback(
    async (file: File) => {
      if (file.type && file.type !== "application/pdf") {
        setState({
          document: null,
          error: "Please choose a PDF file.",
          status: "error",
        });
        return null;
      }

      return openBytes(await file.arrayBuffer(), file.name);
    },
    [openBytes],
  );

  useEffect(() => {
    return () => {
      destroyCurrentDocument();
    };
  }, [destroyCurrentDocument]);

  return {
    clearFile,
    document: state.document,
    error: state.error,
    openBytes,
    openFile,
    status: state.status,
  };
}

export { usePdfDocument };
