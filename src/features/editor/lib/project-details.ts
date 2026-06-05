import type { EditorOverlay } from "@/features/editor/editor-types";
import type { Project } from "@/features/editor/lib/editor-projects";

const byteUnits = ["bytes", "KB", "MB", "GB"] as const;

type ProjectDetails = {
  layerCount: number;
  originalSize: string;
  pagesEdited: number;
};

function getProjectDetails(project: Project): ProjectDetails {
  const overlays = project.history.present.overlays;

  return {
    layerCount: overlays.length,
    originalSize: formatByteSize(project.pdfBytes.byteLength),
    pagesEdited: getEditedPageCount(overlays),
  };
}

function getEditedPageCount(overlays: EditorOverlay[]) {
  return new Set(overlays.map((overlay) => overlay.pageNumber)).size;
}

function formatByteSize(byteCount: number) {
  if (byteCount < 0 || !Number.isFinite(byteCount)) {
    return "0 bytes";
  }

  if (byteCount < 1024) {
    return `${byteCount} ${byteCount === 1 ? "byte" : "bytes"}`;
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(byteCount) / Math.log(1024)),
    byteUnits.length - 1,
  );
  const unit = byteUnits[unitIndex];
  const unitValue = byteCount / 1024 ** unitIndex;
  const maximumFractionDigits = unitValue >= 10 ? 0 : 1;

  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(unitValue)} ${unit} (${new Intl.NumberFormat().format(
    byteCount,
  )} bytes)`;
}

function formatProjectDetailsDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export {
  formatByteSize,
  formatProjectDetailsDate,
  getEditedPageCount,
  getProjectDetails,
};
export type { ProjectDetails };
