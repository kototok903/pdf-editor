import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/features/editor/lib/editor-projects";
import { getProjectDetails } from "@/features/editor/lib/project-details";
import type { PdfDocumentMetadata } from "@/features/pdf/lib/pdf-document-details";
import type { PageSize } from "@/features/pdf/pdf-types";
import { formatDate } from "@/lib/utils";

type ProjectDetailsDialogProps = {
  metadata: PdfDocumentMetadata | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pageSizes: Record<number, PageSize>;
  project: Project | null;
};

function ProjectDetailsDialog({
  metadata,
  onOpenChange,
  open,
  pageSizes,
  project,
}: ProjectDetailsDialogProps) {
  const details = project
    ? getProjectDetails(project, { metadata, pageSizes })
    : null;
  const pdfMetadata = details?.metadata ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex flex-col max-h-[min(50rem,calc(100vh-2rem))] sm:max-w-xl"
      >
        <DialogHeader className="border-b px-4 pb-3 -mx-4">
          <DialogTitle>Details</DialogTitle>
        </DialogHeader>

        {project && details && (
          <div className="min-h-0 overflow-y-auto pr-4 -mr-4">
            <div className="grid gap-4">
              <ProjectDetailsSection>
                <ProjectDetailRow label="File name" value={project.fileName} />
                <ProjectDetailRow
                  label="File size"
                  value={details.originalSize}
                />
              </ProjectDetailsSection>

              <ProjectDetailsSection>
                <ProjectDetailRow label="Title" value={pdfMetadata?.title} />
                <ProjectDetailRow label="Author" value={pdfMetadata?.author} />
                <ProjectDetailRow
                  label="Subject"
                  value={pdfMetadata?.subject}
                />
                <ProjectDetailRow
                  label="Keywords"
                  value={pdfMetadata?.keywords}
                />
                <ProjectDetailRow
                  label="File created"
                  value={
                    pdfMetadata?.createdAt
                      ? formatDate(pdfMetadata.createdAt)
                      : null
                  }
                />
                <ProjectDetailRow
                  label="File modified"
                  value={
                    pdfMetadata?.modifiedAt
                      ? formatDate(pdfMetadata.modifiedAt)
                      : null
                  }
                />
                <ProjectDetailRow
                  label="Application"
                  value={pdfMetadata?.application}
                />
              </ProjectDetailsSection>

              <ProjectDetailsSection>
                <ProjectDetailRow
                  label="PDF producer"
                  value={pdfMetadata?.pdfProducer}
                />
                <ProjectDetailRow
                  label="PDF version"
                  value={pdfMetadata?.pdfVersion}
                />
                <ProjectDetailRow
                  label="Page count"
                  value={new Intl.NumberFormat().format(project.pageCount)}
                />
                <ProjectDetailRow label="Page size" value={details.pageSize} />
              </ProjectDetailsSection>

              <ProjectDetailsSection>
                <ProjectDetailRow
                  label="Layers"
                  value={new Intl.NumberFormat().format(details.layerCount)}
                />
                <ProjectDetailRow
                  label="Pages edited"
                  value={new Intl.NumberFormat().format(details.pagesEdited)}
                />
                <ProjectDetailRow
                  label="Project modified"
                  value={formatDate(project.lastModifiedAt)}
                />
              </ProjectDetailsSection>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailsSection({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-2 border-t not-first:pt-4 first:border-t-0">
      {children}
    </dl>
  );
}

function ProjectDetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const isMissing = value == null;

  return (
    <div className="grid grid-cols-[minmax(7.5rem,0.34fr)_minmax(0,1fr)] items-baseline gap-4 text-sm leading-tight">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd
        className={
          isMissing
            ? "min-w-0 text-right text-muted-foreground"
            : "min-w-0 text-right font-medium wrap-break-word"
        }
      >
        {isMissing ? "-" : value}
      </dd>
    </div>
  );
}

export { ProjectDetailsDialog };
