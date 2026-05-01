import { Skeleton } from "@/components/ui/skeleton";
import { PdfDocumentView } from "@/features/pdf/components/PdfDocumentView";
import { PdfUploadEmptyState } from "@/features/pdf/components/PdfUploadEmptyState";
import type {
  LoadedPdfDocument,
  PdfLoadStatus,
} from "@/features/pdf/pdf-types";

type DocumentWorkspaceProps = {
  document: LoadedPdfDocument | null;
  error: string | null;
  onOpenFile: () => void;
  status: PdfLoadStatus;
  zoom: number;
};

function DocumentWorkspace({
  document,
  error,
  onOpenFile,
  status,
  zoom,
}: DocumentWorkspaceProps) {
  return (
    <section className="min-h-0 flex-1 overflow-auto px-7 py-7">
      {status === "empty" && <PdfUploadEmptyState onOpenFile={onOpenFile} />}

      {status === "loading" && <PdfPageSkeleton />}

      {status === "error" && (
        <WorkspaceMessage
          title="Unable to open PDF"
          description={error ?? "Please try another PDF file."}
          actionLabel="Choose another PDF"
          onAction={onOpenFile}
        />
      )}

      {status === "loaded" && document && (
        <PdfDocumentView document={document} scale={zoom} />
      )}
    </section>
  );
}

function PdfPageSkeleton() {
  return (
    <div className="space-y-7">
      <Skeleton className="mx-auto h-[800px] w-[600px] shadow-page" />
    </div>
  );
}

function WorkspaceMessage({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="mx-auto flex min-h-[360px] w-full max-w-lg flex-col items-center justify-center rounded-lg border bg-toolbar/70 px-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export { DocumentWorkspace };
