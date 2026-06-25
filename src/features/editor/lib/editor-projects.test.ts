import { describe, expect, it } from "vitest";

import { createEditorHistory } from "@/features/editor/lib/editor-history";
import {
  createProject,
  createProjectId,
  getNextActiveProjectAfterClose,
  removeProject,
  sortProjectsForSwitcher,
  updateProjectFromDocument,
  upsertProject,
  type Project,
} from "@/features/editor/lib/editor-projects";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

function createLoadedDocument(
  patch: Partial<LoadedPdfDocument> = {},
): LoadedPdfDocument {
  return {
    bytes: new Uint8Array([1, 2, 3]).buffer,
    fileName: "form.pdf",
    pageCount: 3,
    pdfDocument: {} as LoadedPdfDocument["pdfDocument"],
    ...patch,
  };
}

function createTestProject(patch: Partial<Project> = {}): Project {
  return {
    createdAt: 100,
    currentPage: 1,
    documentSources: [],
    fileName: "form.pdf",
    history: createEditorHistory(),
    id: "project-a",
    lastModifiedAt: 100,
    pageCount: 3,
    pdfBytes: new Uint8Array([1, 2, 3]).buffer,
    ...patch,
  };
}

describe("editor projects", () => {
  it("creates short URL-friendly project ids", () => {
    const projectId = createProjectId();

    expect(projectId).toHaveLength(10);
    expect(projectId).toMatch(/^[\w-]+$/);
  });

  it("creates a project from a loaded PDF document", () => {
    const document = createLoadedDocument({ fileName: "lease.pdf" });
    const project = createProject({
      currentPage: 99,
      document,
      id: "project-a",
      now: 500,
    });

    expect(project).toMatchObject({
      createdAt: 500,
      currentPage: 3,
      fileName: "lease.pdf",
      id: "project-a",
      lastModifiedAt: 500,
      pageCount: 3,
      pdfBytes: document.bytes,
    });
  });

  it("updates an existing project from the active document state", () => {
    const project = createTestProject({ id: "project-a" });
    const document = createLoadedDocument({
      bytes: new Uint8Array([9, 8, 7]).buffer,
      fileName: "updated.pdf",
      pageCount: 2,
    });
    const history = createEditorHistory([]);

    const updatedProject = updateProjectFromDocument(project, {
      currentPage: 4,
      document,
      history,
      lastModifiedAt: 700,
    });

    expect(updatedProject).toMatchObject({
      currentPage: 2,
      fileName: "updated.pdf",
      lastModifiedAt: 700,
      pageCount: 2,
      pdfBytes: document.bytes,
    });
    expect(updatedProject.documentSources).toHaveLength(1);
    expect(updatedProject.history.present.documentPages).toHaveLength(2);
  });

  it("preserves the project last modified timestamp by default", () => {
    const project = createTestProject({
      id: "project-a",
      lastModifiedAt: 400,
    });
    const document = createLoadedDocument({
      fileName: "updated.pdf",
      pageCount: 2,
    });

    expect(
      updateProjectFromDocument(project, {
        currentPage: 2,
        document,
        history: createEditorHistory([]),
      }).lastModifiedAt,
    ).toBe(400);
  });

  it("upserts and removes projects by id", () => {
    const projectA = createTestProject({ id: "project-a", fileName: "a.pdf" });
    const projectB = createTestProject({ id: "project-b", fileName: "b.pdf" });
    const updatedProjectA = createTestProject({
      id: "project-a",
      fileName: "updated-a.pdf",
    });

    expect(upsertProject([projectA], projectB)).toEqual([projectA, projectB]);
    expect(upsertProject([projectA, projectB], updatedProjectA)).toEqual([
      updatedProjectA,
      projectB,
    ]);
    expect(removeProject([projectA, projectB], "project-a")).toEqual([
      projectB,
    ]);
  });

  it("selects the most recently modified remaining project after close", () => {
    const projectA = createTestProject({
      id: "project-a",
      lastModifiedAt: 100,
    });
    const projectB = createTestProject({
      id: "project-b",
      lastModifiedAt: 300,
    });
    const projectC = createTestProject({
      id: "project-c",
      lastModifiedAt: 200,
    });

    expect(
      getNextActiveProjectAfterClose(
        [projectA, projectB, projectC],
        "project-b",
      )?.id,
    ).toBe("project-c");
  });

  it("sorts switcher projects with active first and the rest by last modified", () => {
    const projectA = createTestProject({
      id: "project-a",
      lastModifiedAt: 100,
    });
    const projectB = createTestProject({
      id: "project-b",
      lastModifiedAt: 300,
    });
    const projectC = createTestProject({
      id: "project-c",
      lastModifiedAt: 200,
    });

    expect(
      sortProjectsForSwitcher([projectA, projectB, projectC], "project-a").map(
        (project) => project.id,
      ),
    ).toEqual(["project-a", "project-b", "project-c"]);
  });
});
