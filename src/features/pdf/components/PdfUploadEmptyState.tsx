import { FileIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type PdfUploadEmptyStateProps = {
  onOpenFile: () => void;
};

function PdfUploadEmptyState({ onOpenFile }: PdfUploadEmptyStateProps) {
  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-border bg-toolbar/70 px-8 text-center">
      <div className="grid size-12 place-items-center rounded-lg border bg-toolbar-button text-muted-foreground">
        <FileIcon aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-xl font-semibold">Open a PDF to start</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Files stay in your browser. Choose a PDF and it will render into the
        editor workspace.
      </p>
      <Button className="mt-5" onClick={onOpenFile} type="button">
        Open PDF
      </Button>
    </div>
  );
}

export { PdfUploadEmptyState };
