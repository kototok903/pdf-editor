import { useMemo, useState, type ReactNode } from "react";
import { RotateCcwIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/features/editor/lib/editor-projects";
import { getProjectDetails } from "@/features/editor/lib/project-details";
import {
  clonePdfProjectMetadata,
  emptyPdfProjectMetadata,
  normalizePdfProjectMetadata,
  standardMetadataInfoKeys,
  type PdfProjectMetadata,
  type PdfTrappedStatus,
} from "@/features/pdf/lib/pdf-metadata";
import type { PageSize } from "@/features/pdf/pdf-types";
import { cn, formatDate } from "@/lib/utils";
import ScrollFade from "@/components/ui/scroll-fade";

type ProjectDetailsDialogProps = {
  editOpen: boolean;
  onEdit: () => void;
  onEditOpenChange: (open: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onUpdateMetadata: (metadata: PdfProjectMetadata) => void;
  open: boolean;
  pageSizes: Record<number, PageSize>;
  project: Project | null;
};

function ProjectDetailsDialog({
  editOpen,
  onEdit,
  onEditOpenChange,
  onOpenChange,
  onUpdateMetadata,
  open,
  pageSizes,
  project,
}: ProjectDetailsDialogProps) {
  const details = project
    ? getProjectDetails(project, {
        metadata: project.metadata ?? emptyPdfProjectMetadata,
        pageSizes,
      })
    : null;
  const pdfMetadata = details?.metadata ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[min(50rem,calc(100vh-2rem))] flex-col gap-0 sm:max-w-xl"
        >
          <DialogHeader separated>
            <DialogTitle>Details</DialogTitle>
          </DialogHeader>

          {project && details && pdfMetadata && (
            <ScrollFade
              fadeColor="var(--popover)"
              outerClassName="flex flex-col min-h-0"
              innerClassName="p-4 -mx-4"
            >
              <div className="flex flex-col gap-4">
                <ProjectDetailsSection>
                  <ProjectDetailRow
                    label="File name"
                    value={project.fileName}
                  />
                  <ProjectDetailRow
                    label="File size"
                    value={details.originalSize}
                  />
                </ProjectDetailsSection>

                <ProjectDetailsSection>
                  <ProjectDetailRow label="Title" value={pdfMetadata.title} />
                  <ProjectDetailRow label="Author" value={pdfMetadata.author} />
                  <ProjectDetailRow
                    label="Subject"
                    value={pdfMetadata.subject}
                  />
                  <ProjectDetailRow
                    label="Keywords"
                    value={pdfMetadata.keywords}
                  />
                  <ProjectDetailRow
                    label="Language"
                    value={pdfMetadata.language}
                  />
                  <ProjectDetailRow
                    label="Creator"
                    value={pdfMetadata.creator}
                  />
                  <ProjectDetailRow
                    label="PDF producer"
                    value={pdfMetadata.producer}
                  />
                  <ProjectDetailRow
                    label="Trapped"
                    value={pdfMetadata.trapped}
                  />
                </ProjectDetailsSection>

                <ProjectDetailsSection>
                  <ProjectDetailRow
                    label="Page count"
                    value={new Intl.NumberFormat().format(project.pageCount)}
                  />
                  <ProjectDetailRow
                    label="Page size"
                    value={details.pageSize}
                  />
                </ProjectDetailsSection>

                {pdfMetadata.customProperties.length > 0 && (
                  <ProjectDetailsSection>
                    {pdfMetadata.customProperties.map((property) => (
                      <ProjectDetailRow
                        key={property.key}
                        label={property.key}
                        value={property.value}
                      />
                    ))}
                  </ProjectDetailsSection>
                )}

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
            </ScrollFade>
          )}

          <DialogFooter>
            <Button onClick={onEdit} type="button" variant="outline">
              Edit
            </Button>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditProjectMetadataDialog
        key={`${project?.id ?? "empty"}:${editOpen ? "open" : "closed"}`}
        onOpenChange={onEditOpenChange}
        onUpdateMetadata={onUpdateMetadata}
        open={editOpen}
        project={project}
      />
    </>
  );
}

function EditProjectMetadataDialog({
  onOpenChange,
  onUpdateMetadata,
  open,
  project,
}: {
  onOpenChange: (open: boolean) => void;
  onUpdateMetadata: (metadata: PdfProjectMetadata) => void;
  open: boolean;
  project: Project | null;
}) {
  const [draftMetadata, setDraftMetadata] = useState<PdfProjectMetadata | null>(
    () =>
      project
        ? clonePdfProjectMetadata(project.metadata ?? emptyPdfProjectMetadata)
        : null,
  );
  const customPropertyError = useMemo(
    () =>
      draftMetadata
        ? getCustomPropertyError(draftMetadata.customProperties)
        : null,
    [draftMetadata],
  );

  const updateDraft = (patch: Partial<PdfProjectMetadata>) => {
    setDraftMetadata((currentMetadata) =>
      currentMetadata ? { ...currentMetadata, ...patch } : currentMetadata,
    );
  };

  const handleSave = () => {
    if (!draftMetadata || customPropertyError) {
      return;
    }

    onUpdateMetadata(normalizePdfProjectMetadata(draftMetadata));
    onOpenChange(false);
  };

  const handleReset = () => {
    if (!project) {
      return;
    }

    setDraftMetadata(
      clonePdfProjectMetadata(
        project.originalMetadata ?? project.metadata ?? emptyPdfProjectMetadata,
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[min(45rem,calc(100vh-2rem))] flex-col gap-0 sm:max-w-md"
      >
        <DialogHeader separated>
          <DialogTitle>Edit metadata</DialogTitle>
        </DialogHeader>

        {draftMetadata && (
          <ScrollFade
            fadeColor="var(--popover)"
            outerClassName="flex flex-col min-h-0"
            innerClassName="p-4 -mx-4"
          >
            <div className="flex flex-col gap-4">
              <MetadataField
                label="Title"
                onChange={(value) => updateDraft({ title: value })}
                value={draftMetadata.title}
                placeholder="Enter title"
              />
              <MetadataField
                label="Author"
                onChange={(value) => updateDraft({ author: value })}
                value={draftMetadata.author}
                placeholder="Enter author"
              />
              <MetadataTextareaField
                label="Subject"
                onChange={(value) => updateDraft({ subject: value })}
                value={draftMetadata.subject}
                placeholder="Enter subject"
              />
              <MetadataField
                label="Keywords"
                onChange={(value) => updateDraft({ keywords: value })}
                value={draftMetadata.keywords}
                placeholder="Enter keywords"
              />
              <MetadataField
                label="Language"
                onChange={(value) => updateDraft({ language: value })}
                value={draftMetadata.language}
                placeholder="Enter language"
              />
              <MetadataField
                label="Creator"
                onChange={(value) => updateDraft({ creator: value })}
                value={draftMetadata.creator}
                placeholder="Enter creator"
              />
              <MetadataField
                label="PDF producer"
                onChange={(value) =>
                  updateDraft({
                    isProducerOverridden: true,
                    producer: value,
                  })
                }
                value={draftMetadata.producer}
                placeholder="Enter producer"
              />
              <TrappedStatusField
                onChange={(trapped) => updateDraft({ trapped })}
                value={draftMetadata.trapped}
              />
              <CustomPropertiesEditor
                error={customPropertyError}
                onChange={(customProperties) =>
                  updateDraft({ customProperties })
                }
                properties={draftMetadata.customProperties}
              />
            </div>
          </ScrollFade>
        )}

        <DialogFooter>
          <Button
            className="sm:mr-auto"
            onClick={handleReset}
            type="button"
            variant="outline"
          >
            <RotateCcwIcon aria-hidden />
            Reset
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={Boolean(customPropertyError)}
            onClick={handleSave}
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetadataField({
  label,
  onChange,
  value,
  placeholder,
}: {
  label: string;
  onChange: (value: string | null) => void;
  value: string | null;
  placeholder?: string | null;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <Input
        onChange={(event) => onChange(event.target.value)}
        value={value ?? ""}
        placeholder={placeholder ?? ""}
      />
    </label>
  );
}

function MetadataTextareaField({
  label,
  onChange,
  value,
  placeholder,
}: {
  label: string;
  onChange: (value: string | null) => void;
  value: string | null;
  placeholder?: string | null;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <Textarea
        className="min-h-20 resize-y"
        onChange={(event) => onChange(event.target.value)}
        value={value ?? ""}
        placeholder={placeholder ?? ""}
      />
    </label>
  );
}

function TrappedStatusField({
  onChange,
  value,
}: {
  onChange: (value: PdfTrappedStatus | null) => void;
  value: PdfTrappedStatus | null;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">Trapped</span>
      <Select
        onValueChange={(nextValue) =>
          onChange(
            nextValue === "None" ? null : (nextValue as PdfTrappedStatus),
          )
        }
        value={value ?? "None"}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="None">None</SelectItem>
          <SelectItem value="True">True</SelectItem>
          <SelectItem value="False">False</SelectItem>
          <SelectItem value="Unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>
    </label>
  );
}

function CustomPropertiesEditor({
  error,
  onChange,
  properties,
}: {
  error: string | null;
  onChange: (properties: PdfProjectMetadata["customProperties"]) => void;
  properties: PdfProjectMetadata["customProperties"];
}) {
  const updateProperty = (
    index: number,
    patch: Partial<PdfProjectMetadata["customProperties"][number]>,
  ) => {
    onChange(
      properties.map((property, propertyIndex) =>
        propertyIndex === index ? { ...property, ...patch } : property,
      ),
    );
  };

  return (
    <section className="grid gap-2">
      <h3 className="font-medium text-muted-foreground">Custom properties</h3>
      {properties.map((property, index) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
          key={index}
        >
          <Input
            aria-label="Custom property name"
            aria-invalid={Boolean(error)}
            onChange={(event) =>
              updateProperty(index, { key: event.target.value })
            }
            placeholder="Name"
            value={property.key}
          />
          <Input
            aria-label="Custom property value"
            onChange={(event) =>
              updateProperty(index, { value: event.target.value })
            }
            placeholder="Value"
            value={property.value}
          />
          <Button
            aria-label="Remove custom property"
            className="size-8 p-0"
            onClick={() =>
              onChange(
                properties.filter(
                  (_, propertyIndex) => propertyIndex !== index,
                ),
              )
            }
            type="button"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        className="w-fit"
        onClick={() => onChange([...properties, { key: "", value: "" }])}
        type="button"
        variant="outline"
        size="xs"
      >
        + Add Property
      </Button>
    </section>
  );
}

function getCustomPropertyError(
  properties: PdfProjectMetadata["customProperties"],
) {
  const seenKeys = new Set<string>();

  for (const property of properties) {
    const key = property.key.trim();

    if (!key) {
      return "Custom property names are required.";
    }

    if (standardMetadataInfoKeys.has(key)) {
      return `${key} is edited in a dedicated field.`;
    }

    if (seenKeys.has(key)) {
      return "Custom property names must be unique.";
    }

    seenKeys.add(key);
  }

  return null;
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
        className={cn(
          "min-w-0 text-right",
          isMissing ? "text-muted-foreground" : "font-medium wrap-break-word",
        )}
      >
        {isMissing ? "-" : value}
      </dd>
    </div>
  );
}

export { ProjectDetailsDialog };
