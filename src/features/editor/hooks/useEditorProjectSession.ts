import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { useLocalDraftPersistence } from "@/features/editor/hooks/useLocalDraftPersistence";
import {
  createEditorHistory,
  areEditorHistoriesEqual,
  restoreEditorHistory,
  type EditorHistoryState,
} from "@/features/editor/lib/editor-history";
import {
  clearEditorDraftDatabase,
  type PersistedEditorProjectRecord,
} from "@/features/editor/lib/editor-draft-db";
import {
  createProject,
  removeProject,
  sortProjectsForSwitcher,
  updateProjectFromDocument,
  upsertProject,
  type Project,
} from "@/features/editor/lib/editor-projects";
import {
  createProjectPath,
  getProjectIdFromPath,
  isProjectPath,
} from "@/features/editor/lib/project-route-utils";
import {
  createPdfProjectMetadata,
  emptyPdfProjectMetadata,
  type PdfProjectMetadata,
} from "@/features/pdf/lib/pdf-metadata";
import { getPdfDocumentMetadata } from "@/features/pdf/lib/pdf-document-details";
import type {
  LoadedPdfDocument,
  PdfLoadStatus,
} from "@/features/pdf/pdf-types";

type ProjectModifiedAtCacheEntry = {
  history: EditorHistoryState;
  lastModifiedAt: number;
};

type UseEditorProjectSessionOptions = {
  clearFile: () => void;
  commitPendingTextEdit: () => void;
  currentPage: number;
  document: LoadedPdfDocument | null;
  history: EditorHistoryState;
  imageAssets: ImageAsset[];
  openBytes: (
    bytes: ArrayBuffer,
    fileName: string,
  ) => Promise<LoadedPdfDocument | null>;
  openFile: (file: File) => Promise<LoadedPdfDocument | null>;
  overlays: EditorOverlay[];
  replaceImageAssets: (imageAssets: ImageAsset[]) => void;
  resetHistory: (
    nextOverlays?: EditorOverlay[],
    nextSelectedOverlayId?: string | null,
    nextHistory?: EditorHistoryState,
  ) => void;
  resetProjectRuntimeState: () => void;
  setCurrentPage: (pageNumber: number) => void;
  setScrollToPageRequest: (
    update:
      | {
          behavior: ScrollBehavior;
          pageNumber: number;
          requestId: number;
        }
      | null
      | ((
          currentRequest: {
            behavior: ScrollBehavior;
            pageNumber: number;
            requestId: number;
          } | null,
        ) => {
          behavior: ScrollBehavior;
          pageNumber: number;
          requestId: number;
        } | null),
  ) => void;
  status: PdfLoadStatus;
};

const rootPath = "/";

function useEditorProjectSession({
  clearFile,
  commitPendingTextEdit,
  currentPage,
  document,
  history,
  imageAssets,
  openBytes,
  openFile,
  overlays,
  replaceImageAssets,
  resetHistory,
  resetProjectRuntimeState,
  setCurrentPage,
  setScrollToPageRequest,
  status,
}: UseEditorProjectSessionOptions) {
  const projectModifiedAtCacheRef = useRef<
    Map<string, ProjectModifiedAtCacheEntry>
  >(new Map());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLocalDraftReady, setIsLocalDraftReady] = useState(false);
  const [isRemoveProjectDialogOpen, setIsRemoveProjectDialogOpen] =
    useState(false);
  const [pendingRemoveProjectId, setPendingRemoveProjectId] = useState<
    string | null
  >(null);
  const [projectModifiedAtCache, setProjectModifiedAtCache] = useState<
    Map<string, ProjectModifiedAtCacheEntry>
  >(() => new Map());
  const [projects, setProjects] = useState<Project[]>([]);
  const [routePathname, setRoutePathname] = useState(
    () => window.location.pathname,
  );
  const [routeProjectId, setRouteProjectId] = useState(() =>
    getProjectIdFromPath(window.location.pathname),
  );
  const initialRouteProjectIdRef = useRef(routeProjectId);
  const { clearStoredDraft, hydrateLocalDraft, persistLocalDraftNow } =
    useLocalDraftPersistence({
      activeProjectId,
      currentPage,
      document,
      history,
      imageAssets,
      isReadyToPersist: isLocalDraftReady,
      overlays,
      projects,
    });

  const replaceProjectPath = useCallback((projectId: string | null) => {
    const nextPath = projectId ? createProjectPath(projectId) : rootPath;

    if (window.location.pathname === nextPath) {
      setRoutePathname(nextPath);
      setRouteProjectId(projectId);
      return;
    }

    window.history.replaceState(null, "", nextPath);
    setRoutePathname(nextPath);
    setRouteProjectId(projectId);
  }, []);

  const pushProjectPath = useCallback((projectId: string | null) => {
    const nextPath = projectId ? createProjectPath(projectId) : rootPath;

    if (window.location.pathname === nextPath) {
      setRoutePathname(nextPath);
      setRouteProjectId(projectId);
      return;
    }

    window.history.pushState(null, "", nextPath);
    setRoutePathname(nextPath);
    setRouteProjectId(projectId);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextPathname = window.location.pathname;

      setRoutePathname(nextPathname);
      setRouteProjectId(getProjectIdFromPath(nextPathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const restoreLocalDraft = async () => {
      const restoredDraft = await hydrateLocalDraft();
      const initialRouteProjectId = initialRouteProjectIdRef.current;

      if (isCancelled) {
        for (const asset of restoredDraft.imageAssets) {
          URL.revokeObjectURL(asset.objectUrl);
        }

        return;
      }

      if (restoredDraft.imageAssets.length > 0) {
        replaceImageAssets(restoredDraft.imageAssets);
      }

      if (restoredDraft.draft) {
        const restoredProjects =
          restoredDraft.draft.projects?.map(createProjectFromPersistedRecord) ??
          [];

        if (restoredProjects.length > 0) {
          setProjects(restoredProjects);

          const targetProject = initialRouteProjectId
            ? (restoredProjects.find(
                (project) => project.id === initialRouteProjectId,
              ) ?? null)
            : null;

          if (!targetProject) {
            setActiveProjectId(null);
            clearFile();
            resetHistory();
          } else {
            const restoredDocument = await openBytes(
              targetProject.pdfBytes,
              targetProject.fileName,
            );

            if (isCancelled) {
              return;
            }

            if (restoredDocument) {
              const restoredProject = await hydrateProjectMetadata(
                targetProject,
                restoredDocument,
              );
              const restoredCurrentPage = clampPageNumber(
                restoredProject.currentPage,
                restoredDocument.pageCount,
              );

              setProjects((currentProjects) =>
                upsertProject(currentProjects, restoredProject),
              );
              resetHistory([], null, restoredProject.history);
              setCurrentPage(restoredCurrentPage);
              requestWorkspacePageScroll(setScrollToPageRequest, {
                behavior: "auto",
                pageNumber: restoredCurrentPage,
              });
              setActiveProjectId(restoredProject.id);
            } else {
              toast.error("Unable to restore project", {
                description: "The saved local project could not be opened.",
              });
            }
          }
        } else {
          const restoredDocument = await openBytes(
            restoredDraft.draft.pdfBytes,
            restoredDraft.draft.fileName,
          );

          if (isCancelled) {
            return;
          }

          if (restoredDocument) {
            const restoredHistory = restoredDraft.draft.history
              ? restoreEditorHistory(restoredDraft.draft.history)
              : createEditorHistory(restoredDraft.draft.overlays);
            resetHistory([], null, restoredHistory);
            const restoredCurrentPage = clampPageNumber(
              restoredDraft.draft.currentPage,
              restoredDocument.pageCount,
            );
            setCurrentPage(restoredCurrentPage);
            requestWorkspacePageScroll(setScrollToPageRequest, {
              behavior: "auto",
              pageNumber: restoredCurrentPage,
            });
            const restoredProject = await hydrateProjectMetadata(
              createProject({
                currentPage: restoredCurrentPage,
                document: restoredDocument,
                history: restoredHistory,
                id:
                  restoredDraft.draft.projectId ??
                  initialRouteProjectId ??
                  undefined,
                metadata: restoredDraft.draft.metadata,
                now: restoredDraft.draft.updatedAt,
                originalMetadata:
                  restoredDraft.draft.originalMetadata ??
                  restoredDraft.draft.metadata,
              }),
              restoredDocument,
            );
            setProjects([restoredProject]);
            if (initialRouteProjectId === restoredProject.id) {
              setActiveProjectId(restoredProject.id);
            } else {
              setActiveProjectId(null);
              clearFile();
              resetHistory();
            }
          } else {
            try {
              await clearStoredDraft();
            } catch {
              // The restore path already failed; keep the editor usable.
            }

            toast.error("Unable to restore project", {
              description: "The saved local project was removed.",
            });
          }
        }
      }

      if (!isCancelled) {
        setIsLocalDraftReady(true);
      }
    };

    void restoreLocalDraft();

    return () => {
      isCancelled = true;
    };
  }, [
    clearStoredDraft,
    clearFile,
    hydrateLocalDraft,
    openBytes,
    replaceImageAssets,
    resetHistory,
    setCurrentPage,
    setScrollToPageRequest,
  ]);

  const missingProjectId =
    isLocalDraftReady &&
    routeProjectId &&
    routeProjectId !== activeProjectId &&
    !projects.some((project) => project.id === routeProjectId)
      ? routeProjectId
      : null;
  const displayStatus =
    !isLocalDraftReady && status === "empty" ? "loading" : status;

  const isProjectViewCleared =
    !activeProjectId &&
    !document &&
    status === "empty" &&
    currentPage === 1 &&
    isEmptyEditorHistory(history);

  const clearActiveProjectView = useCallback(() => {
    if (isProjectViewCleared) {
      return;
    }

    setActiveProjectId(null);

    if (currentPage !== 1) {
      setCurrentPage(1);
    }

    if (document || status !== "empty") {
      clearFile();
    }

    if (!isEmptyEditorHistory(history)) {
      resetHistory();
    }

    resetProjectRuntimeState();
  }, [
    clearFile,
    currentPage,
    document,
    history,
    isProjectViewCleared,
    resetHistory,
    resetProjectRuntimeState,
    setCurrentPage,
    status,
  ]);

  const getProjectLastModifiedAt = useCallback(
    (project: Project, nextHistory: EditorHistoryState) => {
      if (areEditorHistoriesEqual(project.history, nextHistory)) {
        return project.lastModifiedAt;
      }

      const cachedModifiedAt = projectModifiedAtCacheRef.current.get(
        project.id,
      );

      if (cachedModifiedAt?.history === nextHistory) {
        return cachedModifiedAt.lastModifiedAt;
      }

      const lastModifiedAt = Date.now();

      projectModifiedAtCacheRef.current.set(project.id, {
        history: nextHistory,
        lastModifiedAt,
      });

      return lastModifiedAt;
    },
    [],
  );

  const getActiveProjectSnapshot = useCallback(() => {
    if (!activeProjectId || !document) {
      return null;
    }

    const currentProject =
      projects.find((project) => project.id === activeProjectId) ??
      createProject({
        currentPage,
        document,
        history,
        id: activeProjectId,
      });

    return updateProjectFromDocument(currentProject, {
      currentPage,
      document,
      history,
      lastModifiedAt: getProjectLastModifiedAt(currentProject, history),
      metadata: currentProject.metadata,
      originalMetadata: currentProject.originalMetadata,
    });
  }, [
    activeProjectId,
    currentPage,
    document,
    getProjectLastModifiedAt,
    history,
    projects,
  ]);

  useEffect(() => {
    if (!activeProjectId || !document) {
      return;
    }

    const currentProject =
      projects.find((project) => project.id === activeProjectId) ?? null;

    if (
      !currentProject ||
      areEditorHistoriesEqual(currentProject.history, history)
    ) {
      return;
    }

    setProjectModifiedAtCache((currentCache) => {
      const cachedModifiedAt = currentCache.get(activeProjectId);

      if (cachedModifiedAt?.history === history) {
        return currentCache;
      }

      const nextCache = new Map(currentCache);
      const nextEntry = {
        history,
        lastModifiedAt: Date.now(),
      };

      nextCache.set(activeProjectId, nextEntry);
      projectModifiedAtCacheRef.current.set(activeProjectId, nextEntry);

      return nextCache;
    });
  }, [activeProjectId, document, history, projects]);

  const activateProject = useCallback(
    async (
      project: Project,
      options: { pathUpdate?: "none" | "push" | "replace" } = {},
    ) => {
      setCurrentPage(1);
      resetHistory();
      resetProjectRuntimeState();
      setActiveProjectId(project.id);

      const restoredDocument = await openBytes(
        project.pdfBytes,
        project.fileName,
      );

      if (!restoredDocument) {
        setActiveProjectId(null);
        return false;
      }

      const restoredProject = await hydrateProjectMetadata(
        project,
        restoredDocument,
      );
      const restoredCurrentPage = clampPageNumber(
        restoredProject.currentPage,
        restoredDocument.pageCount,
      );

      setProjects((currentProjects) =>
        upsertProject(currentProjects, restoredProject),
      );
      resetHistory([], null, restoredProject.history);
      setCurrentPage(restoredCurrentPage);
      requestWorkspacePageScroll(setScrollToPageRequest, {
        behavior: "auto",
        pageNumber: restoredCurrentPage,
      });

      if (options.pathUpdate === "push") {
        pushProjectPath(restoredProject.id);
      } else if (options.pathUpdate === "replace") {
        replaceProjectPath(restoredProject.id);
      }

      return true;
    },
    [
      openBytes,
      pushProjectPath,
      replaceProjectPath,
      resetHistory,
      resetProjectRuntimeState,
      setCurrentPage,
      setScrollToPageRequest,
    ],
  );

  const openPdfAsProject = useCallback(
    async (file: File) => {
      commitPendingTextEdit();
      const previousProject = getActiveProjectSnapshot();

      if (previousProject) {
        setProjects((currentProjects) =>
          upsertProject(currentProjects, previousProject),
        );
      }

      setCurrentPage(1);
      resetHistory();
      resetProjectRuntimeState();

      const openedDocument = await openFile(file);

      if (!openedDocument) {
        if (previousProject) {
          await activateProject(previousProject);
        }

        return;
      }

      const project = createProject({
        document: openedDocument,
        history: createEditorHistory(),
      });

      setProjects((currentProjects) =>
        upsertProject(
          previousProject
            ? upsertProject(currentProjects, previousProject)
            : currentProjects,
          project,
        ),
      );
      setActiveProjectId(project.id);
      pushProjectPath(project.id);
      setCurrentPage(1);
      resetHistory();

      void readProjectMetadata(openedDocument).then((metadata) => {
        setProjects((currentProjects) =>
          currentProjects.map((currentProject) =>
            currentProject.id === project.id
              ? {
                  ...currentProject,
                  metadata: currentProject.metadata ?? metadata,
                  originalMetadata: currentProject.originalMetadata ?? metadata,
                }
              : currentProject,
          ),
        );
      });
    },
    [
      activateProject,
      commitPendingTextEdit,
      getActiveProjectSnapshot,
      openFile,
      pushProjectPath,
      resetHistory,
      resetProjectRuntimeState,
      setCurrentPage,
    ],
  );

  const handleRequestRemoveProject = useCallback((projectId: string) => {
    setPendingRemoveProjectId(projectId);
    setIsRemoveProjectDialogOpen(true);
  }, []);

  const closeActiveProject = useCallback(() => {
    commitPendingTextEdit();
    const activeSnapshot = getActiveProjectSnapshot();

    if (activeSnapshot) {
      setProjects((currentProjects) =>
        upsertProject(currentProjects, activeSnapshot),
      );
    }

    setActiveProjectId(null);
    pushProjectPath(null);
    setCurrentPage(1);
    clearFile();
    resetHistory();
    resetProjectRuntimeState();
  }, [
    clearFile,
    commitPendingTextEdit,
    getActiveProjectSnapshot,
    pushProjectPath,
    resetHistory,
    resetProjectRuntimeState,
    setCurrentPage,
  ]);

  const confirmRemoveProject = useCallback(() => {
    setIsRemoveProjectDialogOpen(false);
    commitPendingTextEdit();

    const activeSnapshot = getActiveProjectSnapshot();
    const currentProjects = activeSnapshot
      ? upsertProject(projects, activeSnapshot)
      : projects;
    const projectIdToRemove = pendingRemoveProjectId;
    const nextProjects = projectIdToRemove
      ? removeProject(currentProjects, projectIdToRemove)
      : currentProjects;
    const isRemovingActiveProject =
      Boolean(projectIdToRemove) && projectIdToRemove === activeProjectId;

    setProjects(nextProjects);
    setPendingRemoveProjectId(null);

    if (!isRemovingActiveProject) {
      return;
    }

    setActiveProjectId(null);
    replaceProjectPath(null);
    setCurrentPage(1);
    clearFile();
    resetHistory();
    resetProjectRuntimeState();

    if (nextProjects.length === 0) {
      void clearStoredDraft().catch(() => {
        // Removing the visible project should not be blocked by storage errors.
      });
    }
  }, [
    activeProjectId,
    clearFile,
    clearStoredDraft,
    commitPendingTextEdit,
    getActiveProjectSnapshot,
    pendingRemoveProjectId,
    projects,
    replaceProjectPath,
    resetHistory,
    resetProjectRuntimeState,
    setCurrentPage,
  ]);

  useEffect(() => {
    if (!isLocalDraftReady) {
      return;
    }

    if (status === "loading") {
      return;
    }

    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      if (!routeProjectId && !isProjectPath(routePathname)) {
        if (activeProjectId) {
          const activeSnapshot = getActiveProjectSnapshot();

          if (activeSnapshot) {
            setProjects((currentProjects) =>
              upsertProject(currentProjects, activeSnapshot),
            );
          }
        }

        clearActiveProjectView();
        return;
      }

      if (routeProjectId === activeProjectId) {
        return;
      }

      if (!routeProjectId) {
        clearActiveProjectView();
        return;
      }

      const targetProject = projects.find(
        (project) => project.id === routeProjectId,
      );

      if (!targetProject) {
        clearActiveProjectView();
        return;
      }

      const activeSnapshot = getActiveProjectSnapshot();

      if (activeSnapshot) {
        setProjects((currentProjects) =>
          upsertProject(currentProjects, activeSnapshot),
        );
      }

      void activateProject(targetProject, { pathUpdate: "none" });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    activeProjectId,
    activateProject,
    clearActiveProjectView,
    getActiveProjectSnapshot,
    isLocalDraftReady,
    projects,
    routePathname,
    routeProjectId,
    status,
  ]);

  const toolbarProjects = useMemo(() => {
    if (!activeProjectId || !document) {
      return sortProjectsForSwitcher(projects, activeProjectId);
    }

    const existingProject =
      projects.find((project) => project.id === activeProjectId) ?? null;
    const baseProject =
      existingProject ??
      createProject({
        currentPage,
        document,
        history,
        id: activeProjectId,
      });
    const cachedModifiedAt = projectModifiedAtCache.get(baseProject.id);
    const activeProject = updateProjectFromDocument(baseProject, {
      currentPage,
      document,
      history,
      lastModifiedAt:
        cachedModifiedAt?.history === history
          ? cachedModifiedAt.lastModifiedAt
          : baseProject.lastModifiedAt,
    });

    return sortProjectsForSwitcher(
      upsertProject(projects, activeProject),
      activeProjectId,
    );
  }, [
    activeProjectId,
    currentPage,
    document,
    history,
    projectModifiedAtCache,
    projects,
  ]);

  const activeProject = useMemo(
    () =>
      activeProjectId
        ? (toolbarProjects.find((project) => project.id === activeProjectId) ??
          null)
        : null,
    [activeProjectId, toolbarProjects],
  );

  const updateActiveProjectMetadata = useCallback(
    (nextMetadata: PdfProjectMetadata) => {
      if (!activeProjectId) {
        return;
      }

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === activeProjectId
            ? {
                ...project,
                lastModifiedAt: Date.now(),
                metadata: nextMetadata,
              }
            : project,
        ),
      );
    },
    [activeProjectId],
  );

  const ensureActiveProjectMetadata = useCallback(async () => {
    if (!activeProject || !document) {
      return null;
    }

    if (activeProject.metadata && activeProject.originalMetadata) {
      return activeProject;
    }

    const hydratedProject = await hydrateProjectMetadata(
      activeProject,
      document,
    );

    setProjects((currentProjects) =>
      upsertProject(currentProjects, hydratedProject),
    );

    return hydratedProject;
  }, [activeProject, document]);

  const pendingRemoveProjectFileName = useMemo(() => {
    if (!pendingRemoveProjectId) {
      return null;
    }

    return (
      toolbarProjects.find((project) => project.id === pendingRemoveProjectId)
        ?.fileName ?? null
    );
  }, [pendingRemoveProjectId, toolbarProjects]);

  const selectProject = useCallback(
    (projectId: string) => {
      if (projectId === activeProjectId) {
        return;
      }

      commitPendingTextEdit();
      const activeSnapshot = getActiveProjectSnapshot();
      const currentProjects = activeSnapshot
        ? upsertProject(projects, activeSnapshot)
        : projects;
      const targetProject = currentProjects.find(
        (project) => project.id === projectId,
      );

      if (!targetProject) {
        return;
      }

      setProjects(currentProjects);
      pushProjectPath(projectId);
    },
    [
      activeProjectId,
      commitPendingTextEdit,
      getActiveProjectSnapshot,
      projects,
      pushProjectPath,
    ],
  );

  const openProjectInNewTab = useCallback(
    async (projectId: string) => {
      commitPendingTextEdit();

      const activeSnapshot = getActiveProjectSnapshot();
      const currentProjects = activeSnapshot
        ? upsertProject(projects, activeSnapshot)
        : projects;
      const targetProject = currentProjects.find(
        (project) => project.id === projectId,
      );

      if (!targetProject) {
        return;
      }

      const newTab = window.open("about:blank", "_blank");

      if (!newTab) {
        toast.error("Unable to open project", {
          description: "Your browser blocked the new tab.",
        });
        return;
      }

      newTab.opener = null;
      setProjects(currentProjects);

      try {
        await persistLocalDraftNow({ projects: currentProjects });
        newTab.location.replace(createProjectPath(projectId));
      } catch {
        newTab.close();
        toast.error("Unable to open project", {
          description: "The latest local edits could not be saved first.",
        });
      }
    },
    [
      commitPendingTextEdit,
      getActiveProjectSnapshot,
      persistLocalDraftNow,
      projects,
    ],
  );

  const clearProjectSessionForLocalData = useCallback(async () => {
    await clearEditorDraftDatabase();

    setProjects([]);
    setActiveProjectId(null);
    replaceProjectPath(null);
    setCurrentPage(1);
    clearFile();
    resetHistory();
    resetProjectRuntimeState();
    setPendingRemoveProjectId(null);
    setIsRemoveProjectDialogOpen(false);
  }, [
    clearFile,
    replaceProjectPath,
    resetHistory,
    resetProjectRuntimeState,
    setCurrentPage,
  ]);

  const handleRemoveProjectDialogOpenChange = useCallback((isOpen: boolean) => {
    setIsRemoveProjectDialogOpen(isOpen);

    if (!isOpen) {
      setPendingRemoveProjectId(null);
    }
  }, []);

  return {
    activeProjectId,
    activeProject,
    clearProjectSessionForLocalData,
    closeActiveProject,
    confirmRemoveProject,
    displayStatus,
    getActiveProjectSnapshot,
    isLocalDraftReady,
    isRemoveProjectDialogOpen,
    missingProjectId,
    onRemoveProjectDialogOpenChange: handleRemoveProjectDialogOpenChange,
    openPdfAsProject,
    openProjectInNewTab,
    pendingRemoveProjectFileName,
    removeProject: handleRequestRemoveProject,
    selectProject,
    setIsLocalDraftReady,
    toolbarProjects,
    ensureActiveProjectMetadata,
    updateActiveProjectMetadata,
  };
}

async function readProjectMetadata(document: LoadedPdfDocument) {
  try {
    return createPdfProjectMetadata(
      await getPdfDocumentMetadata(document.pdfDocument),
    );
  } catch {
    return emptyPdfProjectMetadata;
  }
}

async function hydrateProjectMetadata(
  project: Project,
  document: LoadedPdfDocument,
): Promise<Project> {
  if (project.metadata && project.originalMetadata) {
    return project;
  }

  const metadata = await readProjectMetadata(document);

  return {
    ...project,
    metadata: project.metadata ?? metadata,
    originalMetadata: project.originalMetadata ?? metadata,
  };
}

function requestWorkspacePageScroll(
  setScrollToPageRequest: UseEditorProjectSessionOptions["setScrollToPageRequest"],
  request: { behavior: ScrollBehavior; pageNumber: number },
) {
  setScrollToPageRequest((currentRequest) => ({
    ...request,
    requestId: (currentRequest?.requestId ?? 0) + 1,
  }));
}

function clampPageNumber(pageNumber: number, pageCount: number) {
  return Math.min(pageCount, Math.max(1, pageNumber));
}

function isEmptyEditorHistory(history: EditorHistoryState) {
  return (
    history.future.length === 0 &&
    history.past.length === 0 &&
    (history.present.formEdits?.values.length ?? 0) === 0 &&
    history.present.overlays.length === 0 &&
    history.present.selectedOverlayId === null
  );
}

function createProjectFromPersistedRecord(
  record: PersistedEditorProjectRecord,
): Project {
  return {
    createdAt: record.createdAt,
    currentPage: record.currentPage,
    fileName: record.fileName,
    history: record.history
      ? restoreEditorHistory(record.history)
      : createEditorHistory(),
    id: record.id,
    lastModifiedAt: record.updatedAt,
    metadata: record.metadata,
    originalMetadata: record.originalMetadata ?? record.metadata,
    pageCount: record.pageCount,
    pdfBytes: record.pdfBytes,
  };
}

export { useEditorProjectSession };
