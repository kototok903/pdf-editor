import { useEffect, useState, type ReactNode } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MoonIcon,
  PanelLeftIcon,
  Redo2Icon,
  SignatureIcon,
  SquareIcon,
  SunIcon,
  TypeIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedButton } from "@/components/ui/segmented-button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const pages = [1, 2, 3];

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <TooltipProvider>
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <EditorToolbar
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
        />
        <div className="flex min-h-0 flex-1 bg-workspace text-workspace-foreground">
          <PagesSidebar />
          <DocumentWorkspace />
        </div>
      </main>
    </TooltipProvider>
  );
}

function EditorToolbar({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-toolbar text-toolbar-foreground">
      <div className="flex h-12 items-center gap-1.5 px-2.5">
        <TooltipButton label="Toggle pages">
          <Button
            className="w-[30px] px-0"
            size="sm"
            type="button"
            variant="toolbar"
          >
            <PanelLeftIcon aria-hidden="true" />
          </Button>
        </TooltipButton>

        <div className="mr-1 min-w-0">
          <div className="max-w-36 truncate text-xs font-semibold">
            membership.pdf
          </div>
          <div className="text-[11px] text-muted-foreground">3 pages</div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" type="button" variant="toolbar">
              <FileTextIcon aria-hidden="true" />
              File
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <FileIcon aria-hidden="true" /> Open PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DownloadIcon aria-hidden="true" /> Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

        <SegmentedButton
          isActive
          mainLabel="Text tool"
          menuLabel="Text settings"
        >
          <TypeIcon aria-hidden="true" />
        </SegmentedButton>

        <DropdownTool label="Image" icon={<ImageIcon aria-hidden="true" />} />
        <DropdownTool
          label="Sign"
          icon={<SignatureIcon aria-hidden="true" />}
        />

        <SegmentedButton mainLabel="Mark tool" menuLabel="Mark options">
          <CheckIcon aria-hidden="true" />
        </SegmentedButton>

        <SegmentedButton
          mainLabel="Whiteout tool"
          menuLabel="Whiteout color options"
        >
          <SquareIcon aria-hidden="true" />
        </SegmentedButton>

        <div className="ml-auto flex items-center gap-1">
          <TooltipButton label="Undo">
            <Button
              className="w-[30px] px-0"
              size="sm"
              type="button"
              variant="toolbar"
            >
              <Undo2Icon aria-hidden="true" />
            </Button>
          </TooltipButton>
          <TooltipButton label="Redo">
            <Button
              className="w-[30px] px-0"
              size="sm"
              type="button"
              variant="toolbar"
            >
              <Redo2Icon aria-hidden="true" />
            </Button>
          </TooltipButton>

          <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

          <TooltipButton label="Zoom out">
            <Button
              className="w-[30px] px-0"
              size="sm"
              type="button"
              variant="toolbar"
            >
              <ZoomOutIcon aria-hidden="true" />
            </Button>
          </TooltipButton>
          <div className="w-11 text-center text-xs text-muted-foreground">
            100%
          </div>
          <TooltipButton label="Zoom in">
            <Button
              className="w-[30px] px-0"
              size="sm"
              type="button"
              variant="toolbar"
            >
              <ZoomInIcon aria-hidden="true" />
            </Button>
          </TooltipButton>

          <Separator className="mx-1 h-6 self-center!" orientation="vertical" />

          <TooltipButton label={isDark ? "Use light theme" : "Use dark theme"}>
            <Button
              className="w-[30px] px-0"
              onClick={onToggleTheme}
              size="sm"
              type="button"
              variant="toolbar"
            >
              {isDark ? (
                <SunIcon aria-hidden="true" />
              ) : (
                <MoonIcon aria-hidden="true" />
              )}
            </Button>
          </TooltipButton>
        </div>
      </div>
    </header>
  );
}

function DropdownTool({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="toolbar">
          {icon}
          {label}
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>{label} option</DropdownMenuItem>
        <DropdownMenuItem>Manage {label.toLowerCase()}s</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TooltipButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function PagesSidebar() {
  return (
    <aside className="w-20 shrink-0 border-r border-sidebar-border bg-sidebar p-2 text-sidebar-foreground">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span>Page</span>
        <span className="text-muted-foreground">1/3</span>
      </div>
      <div className="space-y-3">
        {pages.map((page) => (
          <button
            className="h-20 w-full rounded-md border bg-page shadow-sm first:border-2 first:border-primary"
            key={page}
            type="button"
          >
            <span className="sr-only">Page {page}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function DocumentWorkspace() {
  return (
    <section className="min-h-[calc(100vh-3rem)] flex-1 overflow-auto px-7 py-7">
      <div className="space-y-7">
        <FakePdfPage />
        <div className="mx-auto min-h-64 w-[430px] border bg-page shadow-page" />
      </div>
    </section>
  );
}

function FakePdfPage() {
  return (
    <article className="mx-auto min-h-[610px] w-[430px] border bg-page text-page-foreground shadow-page">
      <div className="p-9">
        <div className="mb-8 rounded bg-blue-600 px-5 py-4 text-white">
          PDF reader in Microsoft Edge
        </div>
        <div className="mb-4 h-3 w-full rounded bg-slate-200" />
        <div className="mb-4 h-3 w-10/12 rounded bg-slate-200" />
        <div className="mb-8 h-3 w-11/12 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-px bg-slate-300 text-xs">
          <div className="bg-white p-3">Version</div>
          <div className="bg-white p-3">1.0</div>
          <div className="bg-white p-3">Platform</div>
          <div className="bg-white p-3">Browser</div>
          <div className="bg-white p-3">Status</div>
          <div className="bg-white p-3">
            <span className="font-bold text-emerald-700">✓</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default App;
