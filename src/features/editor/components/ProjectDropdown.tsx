import { memo, useState } from "react";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  FileDownIcon,
  FileIcon,
  FileTextIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/features/editor/lib/editor-projects";
import { ProjectDetailsDialog } from "@/features/editor/components/ProjectDetailsDialog";
import { Tooltip } from "@/components/ui/tooltip";
import type { PdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";
import type { PageSize } from "@/features/pdf/pdf-types";

type ProjectDropdownProps = {
  activeProject: Project | null;
  hasPdf: boolean;
  fileName: string | null;
  pageSizes: Record<number, PageSize>;
  projects: Project[];
  activeProjectId: string | null;
  isExporting: boolean;
  isLoading: boolean;
  canCloseProject: boolean;
  onExportPdf: () => void;
  onOpenFile: () => void;
  onCloseActiveProject: () => void;
  onOpenProjectInNewTab: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onUpdateActiveProjectMetadata: (metadata: PdfProjectMetadata) => void;
};

const ProjectDropdown = memo(function ProjectDropdown({
  activeProject,
  hasPdf,
  fileName,
  pageSizes,
  projects,
  activeProjectId,
  isExporting,
  isLoading,
  canCloseProject,
  onExportPdf,
  onOpenFile,
  onCloseActiveProject,
  onOpenProjectInNewTab,
  onSelectProject,
  onRemoveProject,
  onUpdateActiveProjectMetadata,
}: ProjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditMetadataDialogOpen, setIsEditMetadataDialogOpen] =
    useState(false);
  const activeProjectDisplayName = activeProject?.metadata?.title ?? fileName;

  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-7.5 w-19.5" />
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip
            tooltip={activeProjectDisplayName ?? ""}
            disabled={!activeProjectDisplayName || isOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                className="min-w-0 justify-start gap-1.5 text-left"
                size="sm"
                type="button"
                variant="toolbar"
              >
                <FileTextIcon aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block max-w-36 truncate">
                    {activeProjectDisplayName ?? "File"}
                  </span>
                </span>
                <ChevronDownIcon aria-hidden="true" className="shrink-0" />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-72 p-1.5">
            <DropdownMenuItem
              onSelect={() => {
                setIsOpen(false);
                onOpenFile();
              }}
            >
              <FileIcon aria-hidden="true" /> Open PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasPdf || isExporting}
              onSelect={onExportPdf}
            >
              <FileDownIcon aria-hidden="true" />{" "}
              {isExporting ? "Exporting..." : "Export PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!activeProject}
              onSelect={() => {
                setIsOpen(false);
                setIsDetailsDialogOpen(true);
              }}
            >
              <InfoIcon aria-hidden="true" /> Details
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canCloseProject}
              onSelect={onCloseActiveProject}
            >
              <XIcon aria-hidden="true" /> Close Project
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Open projects</DropdownMenuLabel>

            {projects.length === 0 ? (
              <div className="px-1.5 py-2 text-xs text-muted-foreground">
                Open PDFs will appear here.
              </div>
            ) : (
              <div className="grid gap-1">
                {projects.length > 0 ? (
                  projects.map((project) => {
                    const isActive = project.id === activeProjectId;

                    return (
                      <div
                        className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-transparent p-1.5 text-left outline-none hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/10"
                        data-active={isActive}
                        key={project.id}
                        onClick={() => {
                          setIsOpen(false);
                          onSelectProject(project.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setIsOpen(false);
                            onSelectProject(project.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {getProjectDisplayName(project)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {project.pageCount}{" "}
                            {project.pageCount === 1 ? "page" : "pages"} ·{" "}
                            {formatProjectLastModified(project.lastModifiedAt)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-0">
                          {!isActive && (
                            <Button
                              aria-label={`Open ${project.fileName} in new tab`}
                              className="size-7 p-0"
                              onClick={(event) => {
                                event.stopPropagation();
                                setIsOpen(false);
                                onOpenProjectInNewTab(project.id);
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                              size="sm"
                              title="Open in new tab"
                              type="button"
                              variant="ghost"
                            >
                              <ExternalLinkIcon aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            aria-label={`Remove ${project.fileName}`}
                            className="size-7 p-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              setIsOpen(false);
                              onRemoveProject(project.id);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <XIcon aria-hidden="true" />
                          </Button>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No projects open
                  </div>
                )}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ProjectDetailsDialog
        onEdit={() => {
          setIsDetailsDialogOpen(false);
          setIsEditMetadataDialogOpen(true);
        }}
        onEditOpenChange={setIsEditMetadataDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        open={isDetailsDialogOpen}
        editOpen={isEditMetadataDialogOpen}
        onUpdateMetadata={onUpdateActiveProjectMetadata}
        pageSizes={pageSizes}
        project={activeProject}
      />
    </div>
  );
});

ProjectDropdown.displayName = "ProjectDropdown";

function getProjectDisplayName(project: Project) {
  return project.metadata?.title ?? project.fileName;
}

function formatProjectLastModified(lastModifiedAt: number) {
  const elapsedMs = Math.max(0, Date.now() - lastModifiedAt);
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  if (elapsedMinutes < 1) {
    return "edited just now";
  }

  if (elapsedMinutes < 60) {
    return `edited ${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `edited ${elapsedHours} hr ago`;
  }

  if (elapsedHours < 48) {
    return "edited yesterday";
  }

  return `edited ${new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(lastModifiedAt)}`;
}

export { ProjectDropdown };
