import {
  isSupportedImageFileName,
  isSupportedImageMimeType,
} from "@/features/editor/lib/image-asset-utils";

type WorkspaceDropFile = Pick<File, "name" | "type">;

type WorkspaceDropAction =
  | {
      file: File;
      type: "image";
    }
  | {
      file: File;
      type: "pdf";
    };

type WorkspaceDragIntent = "image" | "pdf" | null;

function getWorkspaceDropAction(
  files: readonly File[],
  { hasDocument }: { hasDocument: boolean },
): WorkspaceDropAction | null {
  for (const file of files) {
    if (isPdfFile(file)) {
      return { file, type: "pdf" };
    }

    if (hasDocument && isSupportedImageFile(file)) {
      return { file, type: "image" };
    }
  }

  return null;
}

function getWorkspaceDragIntent(
  dataTransfer: DataTransfer,
  { hasDocument }: { hasDocument: boolean },
): WorkspaceDragIntent {
  const itemIntent = getWorkspaceDragIntentFromItems(dataTransfer.items, {
    hasDocument,
  });

  if (itemIntent) {
    return itemIntent;
  }

  return (
    getWorkspaceDropAction(Array.from(dataTransfer.files), {
      hasDocument,
    })?.type ?? null
  );
}

function getWorkspaceDragIntentFromItems(
  items: DataTransferItemList,
  { hasDocument }: { hasDocument: boolean },
): WorkspaceDragIntent {
  for (const item of Array.from(items)) {
    if (item.kind !== "file") {
      continue;
    }

    if (isPdfMimeType(item.type)) {
      return "pdf";
    }

    if (hasDocument && isSupportedImageMimeType(item.type)) {
      return "image";
    }
  }

  return null;
}

function isPdfFile(file: WorkspaceDropFile) {
  return isPdfMimeType(file.type) || file.name.toLowerCase().endsWith(".pdf");
}

function isSupportedImageFile(file: WorkspaceDropFile) {
  return (
    isSupportedImageMimeType(file.type) || isSupportedImageFileName(file.name)
  );
}

function isPdfMimeType(mimeType: string) {
  return mimeType === "application/pdf";
}

export {
  getWorkspaceDragIntent,
  getWorkspaceDropAction,
  isPdfFile,
  isSupportedImageFile,
};
export type { WorkspaceDragIntent, WorkspaceDropAction };
