import {
  isSupportedImageFileName,
  isSupportedImageMimeType,
} from "@/features/editor/lib/image-asset-utils";

type WorkspaceDropFile = Pick<File, "name" | "type">;

export type WorkspaceDropAction =
  | {
      file: File;
      type: "image";
    }
  | {
      file: File;
      type: "pdf";
    };

export type WorkspaceDragIntent = "image" | "pdf" | null;

export function getWorkspaceDropAction(
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

export function getWorkspaceDragIntent(
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

export function isPdfFile(file: WorkspaceDropFile) {
  return isPdfMimeType(file.type) || file.name.toLowerCase().endsWith(".pdf");
}

export function isSupportedImageFile(file: WorkspaceDropFile) {
  return (
    isSupportedImageMimeType(file.type) || isSupportedImageFileName(file.name)
  );
}

function isPdfMimeType(mimeType: string) {
  return mimeType === "application/pdf";
}
