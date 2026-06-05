import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/features/editor/lib/editor-projects";
import {
  formatProjectDetailsDate,
  getProjectDetails,
} from "@/features/editor/lib/project-details";

type ProjectDetailsDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: Project | null;
};

function ProjectDetailsDialog({
  onOpenChange,
  open,
  project,
}: ProjectDetailsDialogProps) {
  const details = project ? getProjectDetails(project) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
        <DialogHeader className="border-b pb-4 px-4 -mx-4">
          <DialogTitle>Details</DialogTitle>
          {project && (
            <DialogDescription className="truncate">
              {project.fileName}
            </DialogDescription>
          )}
        </DialogHeader>

        {project && details && (
          <dl className="grid gap-3">
            <ProjectDetailRow
              label="Original Size"
              value={details.originalSize}
            />
            <ProjectDetailRow
              label="Pages"
              value={new Intl.NumberFormat().format(project.pageCount)}
            />
            <ProjectDetailRow
              label="Layers"
              value={new Intl.NumberFormat().format(details.layerCount)}
            />
            <ProjectDetailRow
              label="Pages Edited"
              value={new Intl.NumberFormat().format(details.pagesEdited)}
            />
            <ProjectDetailRow
              label="Last Modified"
              value={formatProjectDetailsDate(project.lastModifiedAt)}
            />
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(7.5rem,0.45fr)_minmax(0,1fr)] items-baseline gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{value}</dd>
    </div>
  );
}

export { ProjectDetailsDialog };
