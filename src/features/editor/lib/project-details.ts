import type { EditorOverlay } from "@/features/editor/editor-types";
import type { Project } from "@/features/editor/lib/editor-projects";
import type { PdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";
import type { PageSize } from "@/features/pdf/pdf-types";

const byteUnits = ["bytes", "KB", "MB", "GB"] as const;
const pdfPointsPerInch = 72;
const pageSizeTolerance = 0.5;

type ProjectDetails = {
  metadata: PdfProjectMetadata | null;
  layerCount: number;
  originalSize: string;
  pageSize: string | null;
  pagesEdited: number;
};

type GetProjectDetailsOptions = {
  metadata?: PdfProjectMetadata | null;
  pageSizes?: Record<number, PageSize>;
};

function getProjectDetails(
  project: Project,
  { metadata = null, pageSizes = {} }: GetProjectDetailsOptions = {},
): ProjectDetails {
  const overlays = project.history.present.overlays;

  return {
    layerCount: overlays.length,
    metadata,
    originalSize: formatByteSize(project.pdfBytes.byteLength),
    pageSize: getProjectPageSize(project, pageSizes),
    pagesEdited: getEditedPageCount(overlays),
  };
}

function getEditedPageCount(overlays: EditorOverlay[]) {
  return new Set(overlays.map((overlay) => overlay.pageId)).size;
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

function getProjectPageSize(
  project: Project,
  pageSizes: Record<number, PageSize>,
) {
  if (project.pageCount < 1) {
    return null;
  }

  const firstPageSize = pageSizes[1];

  if (!firstPageSize) {
    return null;
  }

  for (let pageNumber = 2; pageNumber <= project.pageCount; pageNumber += 1) {
    const pageSize = pageSizes[pageNumber];

    if (!pageSize) {
      return null;
    }

    if (!arePageSizesEqual(firstPageSize, pageSize)) {
      return "Varies";
    }
  }

  const orientation =
    firstPageSize.width > firstPageSize.height ? "landscape" : "portrait";

  return `${formatInches(firstPageSize.width)} x ${formatInches(
    firstPageSize.height,
  )} in (${orientation})`;
}

function arePageSizesEqual(left: PageSize, right: PageSize) {
  return (
    Math.abs(left.width - right.width) <= pageSizeTolerance &&
    Math.abs(left.height - right.height) <= pageSizeTolerance
  );
}

function formatInches(points: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(points / pdfPointsPerInch);
}

export {
  formatByteSize,
  getEditedPageCount,
  getProjectDetails,
  getProjectPageSize,
};
export type { ProjectDetails };
