import type { DocumentSource } from "@/features/editor/editor-types";
import type { EditorHistoryState } from "@/features/editor/lib/editor-history";
import { createEditorHistory } from "@/features/editor/lib/editor-history";
import {
  createDocumentPagesForSource,
  createDocumentSource,
} from "@/features/editor/lib/document-pages";
import type { PdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";
import { clonePdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type Project = {
  createdAt: number;
  currentPage: number;
  documentSources: DocumentSource[];
  fileName: string;
  history: EditorHistoryState;
  id: string;
  lastModifiedAt: number;
  metadata?: PdfProjectMetadata;
  originalMetadata?: PdfProjectMetadata;
  pageCount: number;
  pdfBytes: ArrayBuffer;
};

type CreateProjectInput = {
  currentPage?: number;
  document: LoadedPdfDocument;
  history?: EditorHistoryState;
  id?: string;
  metadata?: PdfProjectMetadata;
  now?: number;
  originalMetadata?: PdfProjectMetadata;
};

const projectIdAlphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const defaultProjectIdLength = 10;

function createProjectId(length = defaultProjectIdLength) {
  const randomValues = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(
    randomValues,
    (value) => projectIdAlphabet[value & 63],
  ).join("");
}

function createProject({
  currentPage = 1,
  document,
  history = createEditorHistory(),
  id = createProjectId(),
  metadata,
  now = Date.now(),
  originalMetadata = metadata,
}: CreateProjectInput): Project {
  const documentSource = createDocumentSource({
    bytes: document.bytes,
    fileName: document.fileName,
    pageCount: document.pageCount,
  });
  const documentPages = createDocumentPagesForSource(documentSource);

  return {
    createdAt: now,
    currentPage: clampProjectPage(currentPage, document.pageCount),
    documentSources: [documentSource],
    fileName: document.fileName,
    history: ensureHistoryDocumentPages(history, documentPages),
    id,
    lastModifiedAt: now,
    metadata: cloneOptionalPdfProjectMetadata(metadata),
    originalMetadata: cloneOptionalPdfProjectMetadata(originalMetadata),
    pageCount: document.pageCount,
    pdfBytes: document.bytes,
  };
}

function updateProjectFromDocument(
  project: Project,
  {
    currentPage,
    document,
    history,
    lastModifiedAt = project.lastModifiedAt,
    metadata = project.metadata,
    originalMetadata = project.originalMetadata,
  }: {
    currentPage: number;
    document: LoadedPdfDocument;
    history: EditorHistoryState;
    lastModifiedAt?: number;
    metadata?: PdfProjectMetadata;
    originalMetadata?: PdfProjectMetadata;
  },
): Project {
  const documentSources =
    project.documentSources.length > 0
      ? project.documentSources
      : [
          createDocumentSource({
            bytes: document.bytes,
            fileName: document.fileName,
            pageCount: document.pageCount,
          }),
        ];
  const documentPages =
    history.present.documentPages.length > 0
      ? history.present.documentPages
      : createDocumentPagesForSource(documentSources[0]);
  const pageCount = documentPages.length || document.pageCount;

  return {
    ...project,
    currentPage: clampProjectPage(currentPage, pageCount),
    documentSources,
    fileName: document.fileName,
    history: ensureHistoryDocumentPages(history, documentPages),
    lastModifiedAt,
    metadata: cloneOptionalPdfProjectMetadata(metadata),
    originalMetadata: cloneOptionalPdfProjectMetadata(originalMetadata),
    pageCount,
    pdfBytes: document.bytes,
  };
}

function upsertProject(projects: Project[], project: Project) {
  if (!projects.some((currentProject) => currentProject.id === project.id)) {
    return [...projects, project];
  }

  return projects.map((currentProject) =>
    currentProject.id === project.id ? project : currentProject,
  );
}

function removeProject(projects: Project[], projectId: string) {
  return projects.filter((project) => project.id !== projectId);
}

function getNextActiveProjectAfterClose(
  projects: Project[],
  closedProjectId: string,
) {
  return removeProject(projects, closedProjectId).sort(
    (left, right) => right.lastModifiedAt - left.lastModifiedAt,
  )[0];
}

function sortProjectsForSwitcher(
  projects: Project[],
  activeProjectId: string | null,
) {
  return [...projects].sort((left, right) => {
    if (left.id === activeProjectId) {
      return -1;
    }

    if (right.id === activeProjectId) {
      return 1;
    }

    return right.lastModifiedAt - left.lastModifiedAt;
  });
}

function clampProjectPage(pageNumber: number, pageCount: number) {
  return Math.min(pageCount, Math.max(1, pageNumber));
}

function cloneOptionalPdfProjectMetadata(
  metadata: PdfProjectMetadata | undefined,
) {
  return metadata ? clonePdfProjectMetadata(metadata) : undefined;
}

function ensureHistoryDocumentPages(
  history: EditorHistoryState,
  documentPages: EditorHistoryState["present"]["documentPages"],
) {
  if (history.present.documentPages.length > 0) {
    return history;
  }

  return createEditorHistory(
    history.present.overlays,
    history.present.selectedOverlayId,
    history.present.formEdits,
    documentPages,
  );
}

export {
  createProject,
  createProjectId,
  getNextActiveProjectAfterClose,
  removeProject,
  sortProjectsForSwitcher,
  updateProjectFromDocument,
  upsertProject,
};
export type { Project };
