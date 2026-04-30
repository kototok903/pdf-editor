import type * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SegmentedButtonProps = {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onMenuClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  mainClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  mainLabel?: string;
  menuLabel?: string;
};

function SegmentedButton({
  children,
  isActive = false,
  onClick,
  onMenuClick,
  className,
  mainClassName,
  menuClassName,
  disabled,
  mainLabel,
  menuLabel,
}: SegmentedButtonProps) {
  const variant = isActive ? "toolbar-active" : "toolbar";

  return (
    <div className={cn("inline-flex shrink-0", className)}>
      <Button
        aria-label={mainLabel}
        className={cn("rounded-r-none px-2", mainClassName)}
        disabled={disabled}
        onClick={onClick}
        size="sm"
        type="button"
        variant={variant}
      >
        {children}
      </Button>
      <Button
        aria-label={menuLabel}
        className={cn("-ml-px w-6 rounded-l-none px-0", menuClassName)}
        disabled={disabled}
        onClick={onMenuClick}
        size="sm"
        type="button"
        variant={variant}
      >
        <ChevronDownIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

export { SegmentedButton };
