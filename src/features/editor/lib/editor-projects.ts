import type { EditorHistoryState } from "@/features/editor/lib/editor-history";
import { createEditorHistory } from "@/features/editor/lib/editor-history";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type Project = {
  createdAt: number;
  currentPage: number;
  fileName: string;
  history: EditorHistoryState;
  id: string;
  lastModifiedAt: number;
  pageCount: number;
  pdfBytes: ArrayBuffer;
  pdfTitle: string | null;
};

type CreateProjectInput = {
  currentPage?: number;
  document: LoadedPdfDocument;
  history?: EditorHistoryState;
  id?: string;
  now?: number;
  pdfTitle?: string | null;
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
  now = Date.now(),
  pdfTitle = null,
}: CreateProjectInput): Project {
  return {
    createdAt: now,
    currentPage: clampProjectPage(currentPage, document.pageCount),
    fileName: document.fileName,
    history,
    id,
    lastModifiedAt: now,
    pageCount: document.pageCount,
    pdfBytes: document.bytes,
    pdfTitle,
  };
}

function updateProjectFromDocument(
  project: Project,
  {
    currentPage,
    document,
    history,
    lastModifiedAt = project.lastModifiedAt,
    pdfTitle = project.pdfTitle,
  }: {
    currentPage: number;
    document: LoadedPdfDocument;
    history: EditorHistoryState;
    lastModifiedAt?: number;
    pdfTitle?: string | null;
  },
): Project {
  return {
    ...project,
    currentPage: clampProjectPage(currentPage, document.pageCount),
    fileName: document.fileName,
    history,
    lastModifiedAt,
    pageCount: document.pageCount,
    pdfBytes: document.bytes,
    pdfTitle,
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
