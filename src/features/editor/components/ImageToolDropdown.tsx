import { useState } from "react";
import {
  ClipboardIcon,
  ChevronDownIcon,
  ImageIcon,
  LinkIcon,
  UploadIcon,
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
import type { ImageAsset } from "@/features/editor/editor-types";
import { getImageMetadataLabel } from "@/features/editor/lib/image-asset-utils";

type ImageToolDropdownProps = {
  activeImageAssetId: string | null;
  disabled: boolean;
  imageAssets: ImageAsset[];
  isSelected: boolean;
  onImportImageFromClipboard: () => void;
  onOpenUrlDialog: () => void;
  onRemoveImageAssetFromRecents: (assetId: string) => void;
  onSelectImageAsset: (assetId: string) => void;
  onUploadImage: () => void;
};

function ImageToolDropdown({
  activeImageAssetId,
  disabled,
  imageAssets,
  isSelected,
  onImportImageFromClipboard,
  onOpenUrlDialog,
  onRemoveImageAssetFromRecents,
  onSelectImageAsset,
  onUploadImage,
}: ImageToolDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectImageAsset = (assetId: string) => {
    onSelectImageAsset(assetId);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          size="sm"
          type="button"
          variant={isSelected ? "toolbar-active" : "toolbar"}
        >
          <ImageIcon aria-hidden="true" />
          Image
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <DropdownMenuItem onSelect={onUploadImage}>
          <UploadIcon aria-hidden="true" />
          Upload image
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenUrlDialog}>
          <LinkIcon aria-hidden="true" />
          From URL
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onImportImageFromClipboard}>
          <ClipboardIcon aria-hidden="true" />
          From Clipboard
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Recent images</DropdownMenuLabel>

        {imageAssets.length === 0 ? (
          <div className="px-1.5 py-2 text-xs text-muted-foreground">
            Uploaded images will appear here.
          </div>
        ) : (
          <div className="grid gap-1">
            {imageAssets.map((asset) => (
              <div
                className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 rounded-md border border-transparent p-1.5 text-left outline-none hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/10"
                data-active={asset.id === activeImageAssetId}
                key={asset.id}
                onClick={() => handleSelectImageAsset(asset.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectImageAsset(asset.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="grid size-10 place-items-center overflow-hidden rounded-md border bg-background">
                  <img
                    alt={asset.name}
                    className="size-full min-h-0 min-w-0 object-contain"
                    src={asset.objectUrl}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {asset.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {getImageMetadataLabel(asset)}
                  </span>
                </span>
                <Button
                  aria-label={`Remove ${asset.name} from recent images`}
                  className="size-7 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveImageAssetFromRecents(asset.id);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ImageToolDropdown };
