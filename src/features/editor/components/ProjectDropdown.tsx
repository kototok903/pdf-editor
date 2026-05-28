import {
  ChevronDownIcon,
  FileDownIcon,
  FileIcon,
  FileTextIcon,
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
import { TooltipButton } from "@/features/editor/components/TooltipButton";

type ProjectDropdownProps = {
  hasPdf: boolean;
  fileName: string | null;
  projects: Project[];
  activeProjectId: string | null;
  isExporting: boolean;
  isLoading: boolean;
  canCloseProject: boolean;
  onExportPdf: () => void;
  onOpenFile: () => void;
  onCloseActiveProject: () => void;
  onSelectProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
};

function ProjectDropdown({
  hasPdf,
  fileName,
  projects,
  activeProjectId,
  isExporting,
  isLoading,
  canCloseProject,
  onExportPdf,
  onOpenFile,
  onCloseActiveProject,
  onSelectProject,
  onRemoveProject,
}: ProjectDropdownProps) {
  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-7.5 w-19.5" />
      ) : (
        <DropdownMenu>
          <TooltipButton label={fileName ?? ""} disabled={!fileName}>
            <DropdownMenuTrigger asChild>
              <Button
                className="min-w-0 justify-start gap-1.5 text-left"
                title={fileName ?? undefined}
                size="sm"
                type="button"
                variant="toolbar"
              >
                <FileTextIcon aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block max-w-36 truncate">
                    {fileName ?? "File"}
                  </span>
                </span>
                <ChevronDownIcon aria-hidden="true" className="shrink-0" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipButton>
          <DropdownMenuContent align="start" className="w-72 p-1.5">
            <DropdownMenuItem
              onSelect={() => {
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
                      >
                        <button
                          aria-current={isActive ? "true" : undefined}
                          className="min-w-0 text-left"
                          onClick={() => onSelectProject(project.id)}
                          type="button"
                        >
                          <span className="block truncate text-sm font-medium">
                            {project.fileName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {project.pageCount}{" "}
                            {project.pageCount === 1 ? "page" : "pages"} ·{" "}
                            {formatProjectLastModified(project.lastModifiedAt)}
                          </span>
                        </button>
                        <Button
                          aria-label={`Close ${project.fileName}`}
                          className="size-7 p-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveProject(project.id);
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <XIcon aria-hidden="true" />
                        </Button>
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
    </div>
  );
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
