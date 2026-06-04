import { useState, memo } from "react";
import { ChevronDownIcon, PlusIcon, SignatureIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SignatureCreateDialog } from "@/features/editor/components/SignatureCreateDialog";
import type { SignatureCreateInput } from "@/features/editor/components/SignatureCreateDialog";
import type { ImageAsset } from "@/features/editor/editor-types";

type SignatureToolDropdownProps = {
  activeSignatureAssetId: string | null;
  disabled: boolean;
  isSelected: boolean;
  onCreateSignature: (input: SignatureCreateInput) => Promise<boolean>;
  onRemoveSignatureAssetFromRecents: (assetId: string) => void;
  onSelectSignatureAsset: (assetId: string) => void;
  signatureAssets: ImageAsset[];
};

const SignatureToolButton = memo(function SignatureToolButton({
  activeSignatureAssetId,
  disabled,
  isSelected,
  onCreateSignature,
  onRemoveSignatureAssetFromRecents,
  onSelectSignatureAsset,
  signatureAssets,
}: SignatureToolDropdownProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSelectSignatureAsset = (assetId: string) => {
    onSelectSignatureAsset(assetId);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled}
            size="sm"
            type="button"
            variant={isSelected ? "toolbar-active" : "toolbar"}
          >
            <SignatureIcon aria-hidden="true" />
            Sign
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 p-1.5">
          <DropdownMenuItem
            onSelect={() => {
              setIsCreateDialogOpen(true);
            }}
          >
            <PlusIcon aria-hidden="true" />
            Create signature
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Signatures</DropdownMenuLabel>

          {signatureAssets.length === 0 ? (
            <div className="px-1.5 py-2 text-xs text-muted-foreground">
              Created signatures will appear here.
            </div>
          ) : (
            <div className="grid gap-1">
              {signatureAssets.map((asset) => (
                <div
                  className={cn(
                    "grid min-h-16 grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-transparent p-1.5 text-left outline-none hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    asset.id === activeSignatureAssetId &&
                      "border-primary/50 bg-primary/10",
                  )}
                  key={asset.id}
                  onClick={() => handleSelectSignatureAsset(asset.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectSignatureAsset(asset.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="grid min-h-12 min-w-0 place-items-center overflow-hidden rounded-md border bg-background/70 px-2">
                    <img
                      alt={asset.name}
                      className="max-h-12 w-full min-w-0 object-contain"
                      draggable={false}
                      src={asset.objectUrl}
                    />
                  </span>
                  <Button
                    aria-label="Remove signature from recent signatures"
                    className="size-7 p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveSignatureAssetFromRecents(asset.id);
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
      <SignatureCreateDialog
        onCreateSignature={onCreateSignature}
        onOpenChange={setIsCreateDialogOpen}
        open={isCreateDialogOpen}
      />
    </>
  );
});

export { SignatureToolButton };
