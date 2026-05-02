import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ImageUrlDialogProps = {
  onImportImageUrl: (url: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function ImageUrlDialog({
  onImportImageUrl,
  onOpenChange,
  open,
}: ImageUrlDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!url.trim()) {
      setError("Enter an image URL.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await onImportImageUrl(url.trim());
      setUrl("");
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to import image from this URL.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setError(null);
          setIsLoading(false);
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Image From URL</DialogTitle>
            <DialogDescription>
              The image must allow browser access so it can be used in this
              session.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Input
              autoFocus
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/image.png"
              type="url"
              value={url}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Adding..." : "Add Image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ImageUrlDialog };
