import {
  FileTextDashedIcon,
  Layers2DashedIcon,
} from "@/components/ui/custom-icons";

import { Button } from "@/components/ui/button";
import { TooltipButton } from "@/features/editor/components/TooltipButton";
import { FileTextIcon, Layers2Icon } from "lucide-react";

type SidebarsToggleProps = {
  isPagesSidebarOpen: boolean;
  isLayersSidebarOpen: boolean;
  onTogglePagesSidebar: () => void;
  onToggleLayersSidebar: () => void;
};

function SidebarsToggle({
  isPagesSidebarOpen,
  isLayersSidebarOpen,
  onTogglePagesSidebar,
  onToggleLayersSidebar,
}: SidebarsToggleProps) {
  return (
    <div className="inline-flex shrink-0">
      <TooltipButton label="Toggle pages">
        <Button
          aria-label="Toggle pages sidebar"
          aria-pressed={isPagesSidebarOpen}
          className="w-7.5 rounded-r-none px-0"
          onClick={onTogglePagesSidebar}
          size="sm"
          type="button"
          variant="toolbar"
        >
          {isPagesSidebarOpen ? (
            <FileTextDashedIcon aria-hidden="true" />
          ) : (
            <FileTextIcon aria-hidden="true" />
          )}
        </Button>
      </TooltipButton>
      <TooltipButton label="Toggle layers">
        <Button
          aria-label="Toggle layers sidebar"
          aria-pressed={isLayersSidebarOpen}
          className="-ml-px w-7.5 rounded-l-none px-0"
          onClick={onToggleLayersSidebar}
          size="sm"
          type="button"
          variant="toolbar"
        >
          {isLayersSidebarOpen ? (
            <Layers2DashedIcon aria-hidden="true" />
          ) : (
            <Layers2Icon aria-hidden="true" />
          )}
        </Button>
      </TooltipButton>
    </div>
  );
}

export { SidebarsToggle };
