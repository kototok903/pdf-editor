import type { SVGProps } from "react";

import type { MarkType } from "@/features/editor/editor-types";

function MarkGlyph({
  color,
  markType,
  ...props
}: {
  color: string;
  markType: MarkType;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color }}
      viewBox="0 0 32 32"
      {...props}
    >
      {getMarkGlyph(markType)}
    </svg>
  );
}

function getMarkGlyph(markType: MarkType) {
  switch (markType) {
    case "ballot-x":
      return (
        <>
          <rect
            height="21"
            rx="2.5"
            strokeWidth="2.25"
            width="21"
            x="5.5"
            y="5.5"
          />
          <path d="M11 11L21 21M21 11L11 21" strokeWidth="3" />
        </>
      );
    case "check":
      return <path d="M6 17.5L12.5 24L26 8" strokeWidth="3.5" />;
    case "dot":
      return (
        <circle cx="16" cy="16" fill="currentColor" r="5.5" stroke="none" />
      );
    case "heavy-check":
      return <path d="M5.5 16.5L12.5 24.5L27 7.5" strokeWidth="5" />;
    case "slash-x":
      return (
        <>
          <path d="M9 6L23 26" strokeWidth="3.5" />
          <path d="M23 6L9 26" strokeWidth="2.25" />
        </>
      );
    case "x":
      return (
        <>
          <path d="M8 7.5L24 24.5" strokeWidth="4" />
          <path d="M24 7.5L8 24.5" strokeWidth="4" />
        </>
      );
  }
}

export { MarkGlyph };
