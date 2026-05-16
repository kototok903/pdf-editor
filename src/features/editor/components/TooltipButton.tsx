import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TooltipButtonProps = {
  children: ReactNode;
  label: string;
  disabled?: boolean;
};

function TooltipButton({ children, label, disabled }: TooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger disabled={disabled} asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export { TooltipButton };
