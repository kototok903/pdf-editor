import { FileIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PdfUploadEmptyStateProps = {
  description?: string;
  isPdfDropActive?: boolean;
  onOpenFile: () => void;
  title?: string;
};

function PdfUploadEmptyState({
  description = "Files stay in your browser. Choose a PDF and it will render into the editor workspace.",
  isPdfDropActive = false,
  onOpenFile,
  title = "Open a PDF to start",
}: PdfUploadEmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-105 w-full max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-border bg-toolbar/70 px-8 text-center transition-colors",
        isPdfDropActive && "border-primary bg-primary/10",
      )}
    >
      <div
        className={cn(
          "grid size-12 place-items-center rounded-lg border bg-toolbar-button text-muted-foreground transition-colors",
          isPdfDropActive &&
            "border-primary/30 bg-primary text-primary-foreground",
        )}
      >
        <FileIcon aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <Button className="mt-5" onClick={onOpenFile} type="button">
        Open PDF
      </Button>
    </div>
  );
}

export { PdfUploadEmptyState };
