import { MonitorIcon, MoonIcon, SunIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditorThemeName } from "@/features/editor/lib/editor-preferences";
import { GithubIcon } from "@/components/ui/custom-icons";

const githubUrl = "https://github.com/kototok903/pdf-editor";

type SettingsDialogProps = {
  onClearLocalDataClick: () => void;
  onOpenChange: (open: boolean) => void;
  onThemeChange: (themeName: EditorThemeName) => void;
  open: boolean;
  themeName: EditorThemeName;
};

type ClearLocalDataDialogProps = {
  isClearing: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function SettingsDialog({
  onClearLocalDataClick,
  onOpenChange,
  onThemeChange,
  open,
  themeName,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
        <DialogHeader separated>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="font-medium">Theme</div>
            <Select
              onValueChange={(value) => onThemeChange(value as EditorThemeName)}
              value={themeName}
            >
              <SelectTrigger className="w-34">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <MonitorIcon aria-hidden="true" />
                  System
                </SelectItem>
                <SelectItem value="light">
                  <SunIcon aria-hidden="true" />
                  Light
                </SelectItem>
                <SelectItem value="dark">
                  <MoonIcon aria-hidden="true" />
                  Dark
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="font-medium">Source code</div>
            <Button asChild variant="secondary">
              <a href={githubUrl} rel="noreferrer" target="_blank">
                <GithubIcon aria-hidden="true" />
                Open GitHub
              </a>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Clear local app data</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Deletes projects, recent images, signatures, and settings from
                this browser.
              </div>
            </div>
            <Button
              onClick={onClearLocalDataClick}
              type="button"
              variant="destructive"
            >
              <Trash2Icon aria-hidden="true" />
              Clear data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClearLocalDataDialog({
  isClearing,
  onConfirm,
  onOpenChange,
  open,
}: ClearLocalDataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear local app data?</DialogTitle>
          <DialogDescription>
            This will delete all projects, recent images, saved signatures, and
            settings stored by this app in this browser. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isClearing}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isClearing}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            Clear data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ClearLocalDataDialog, SettingsDialog };
