import { useCallback, useEffect, useRef, useState } from "react";

import { loadPdfDocument } from "@/features/pdf/lib/pdfjs";
import type {
  DocumentSource,
  DocumentSourceId,
} from "@/features/editor/editor-types";
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

export function usePdfDocument() {
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

export function usePdfSourceDocuments(
  documentSources: readonly DocumentSource[],
  primaryDocument: LoadedPdfDocument | null = null,
) {
  const [documentsBySourceId, setDocumentsBySourceId] =
    useState<ReadonlyMap<DocumentSourceId, LoadedPdfDocument>>(
      emptySourceDocuments,
    );
  const loadedDocumentsRef = useRef<Map<DocumentSourceId, LoadedPdfDocument>>(
    new Map(),
  );

  useEffect(() => {
    let isCancelled = false;
    const loadedDocuments = loadedDocumentsRef.current;
    const sourceIds = new Set(documentSources.map((source) => source.id));

    for (const [sourceId, loadedDocument] of loadedDocuments) {
      if (!sourceIds.has(sourceId)) {
        void loadedDocument.pdfDocument.destroy();
        loadedDocuments.delete(sourceId);
      }
    }

    async function loadSources() {
      const nextDocumentsBySourceId = new Map<
        DocumentSourceId,
        LoadedPdfDocument
      >();

      for (const source of documentSources) {
        if (
          primaryDocument &&
          primaryDocument.bytes === source.bytes &&
          primaryDocument.fileName === source.fileName
        ) {
          nextDocumentsBySourceId.set(source.id, primaryDocument);
          continue;
        }

        const loadedDocument = loadedDocuments.get(source.id);

        if (loadedDocument?.bytes === source.bytes) {
          nextDocumentsBySourceId.set(source.id, loadedDocument);
          continue;
        }

        if (loadedDocument) {
          void loadedDocument.pdfDocument.destroy();
          loadedDocuments.delete(source.id);
        }

        const pdfDocument = await loadPdfDocument(source.bytes);

        if (isCancelled) {
          void pdfDocument.destroy();
          return;
        }

        const nextLoadedDocument: LoadedPdfDocument = {
          bytes: source.bytes,
          fileName: source.fileName,
          pageCount: pdfDocument.numPages,
          pdfDocument,
        };

        loadedDocuments.set(source.id, nextLoadedDocument);
        nextDocumentsBySourceId.set(source.id, nextLoadedDocument);
      }

      if (!isCancelled) {
        setDocumentsBySourceId(nextDocumentsBySourceId);
      }
    }

    if (documentSources.length === 0) {
      queueMicrotask(() => {
        if (!isCancelled) {
          setDocumentsBySourceId(emptySourceDocuments);
        }
      });
      return () => {
        isCancelled = true;
      };
    }

    void loadSources();

    return () => {
      isCancelled = true;
    };
  }, [documentSources, primaryDocument]);

  useEffect(() => {
    const loadedDocuments = loadedDocumentsRef.current;

    return () => {
      for (const loadedDocument of loadedDocuments.values()) {
        void loadedDocument.pdfDocument.destroy();
      }
      loadedDocuments.clear();
    };
  }, []);

  return documentsBySourceId;
}

const emptySourceDocuments = new Map<DocumentSourceId, LoadedPdfDocument>();
