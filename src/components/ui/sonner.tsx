import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--toast-success)",
          "--success-border": "var(--toast-success-border)",
          "--success-text": "var(--toast-success-foreground)",
          "--info-bg": "var(--toast-info)",
          "--info-border": "var(--toast-info-border)",
          "--info-text": "var(--toast-info-foreground)",
          "--warning-bg": "var(--toast-warning)",
          "--warning-border": "var(--toast-warning-border)",
          "--warning-text": "var(--toast-warning-foreground)",
          "--error-bg": "var(--toast-error)",
          "--error-border": "var(--toast-error-border)",
          "--error-text": "var(--toast-error-foreground)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
