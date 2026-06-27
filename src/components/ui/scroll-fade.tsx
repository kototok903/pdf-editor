import * as React from "react";

import { cn } from "@/lib/utils";

const DEFAULT_FADE_SIZE = 24;

function useEdgeFade(
  outerRef: React.RefObject<HTMLDivElement | null>,
  innerRef: React.RefObject<HTMLDivElement | null>,
  fadeSize?: number,
  fadeColor?: string,
): void {
  React.useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const cs = getComputedStyle(outer);
      const fadeSizePx =
        parseFloat(cs.getPropertyValue("--fade-size")) ||
        fadeSize ||
        DEFAULT_FADE_SIZE;

      const distanceFromLeft = inner.scrollLeft;
      const distanceToRight = Math.max(
        0,
        inner.scrollWidth - inner.clientWidth - inner.scrollLeft,
      );
      const distanceFromTop = inner.scrollTop;
      const distanceToBottom = Math.max(
        0,
        inner.scrollHeight - inner.clientHeight - inner.scrollTop,
      );

      const leftFactor = Math.max(
        0,
        Math.min(1, distanceFromLeft / fadeSizePx),
      );
      const rightFactor = Math.max(
        0,
        Math.min(1, distanceToRight / fadeSizePx),
      );
      const topFactor = Math.max(0, Math.min(1, distanceFromTop / fadeSizePx));
      const bottomFactor = Math.max(
        0,
        Math.min(1, distanceToBottom / fadeSizePx),
      );

      // Apply to the outer (host) only; pseudo-elements read from here
      outer.style.setProperty("--left", String(leftFactor));
      outer.style.setProperty("--right", String(rightFactor));
      outer.style.setProperty("--top", String(topFactor));
      outer.style.setProperty("--bottom", String(bottomFactor));
    };

    if (typeof fadeSize === "number") {
      outer.style.setProperty("--fade-size", `${fadeSize}px`);
    }
    if (typeof fadeColor === "string" && fadeColor.length > 0) {
      outer.style.setProperty("--fade-color", fadeColor);
    }

    update();
    inner.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(inner);
    resizeObserver.observe(outer);

    return () => {
      inner.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [outerRef, innerRef, fadeSize, fadeColor]);
}

type ScrollFadeProps = {
  children: React.ReactNode;
  innerClassName?: string;
  outerClassName?: string;
  innerStyle?: React.CSSProperties;
  outerStyle?: React.CSSProperties;
  fadeSize?: number;
  fadeColor?: string;
  outerRef?: React.RefObject<HTMLDivElement | null>;
  innerRef?: React.RefObject<HTMLDivElement | null>;
};

function ScrollFade({
  children,
  innerClassName,
  outerClassName,
  innerStyle,
  outerStyle,
  fadeSize,
  fadeColor,
  outerRef,
  innerRef,
}: ScrollFadeProps) {
  const internalOuterRef = React.useRef<HTMLDivElement>(null);
  const internalInnerRef = React.useRef<HTMLDivElement>(null);

  const resolvedOuterRef = outerRef ?? internalOuterRef;
  const resolvedInnerRef = innerRef ?? internalInnerRef;

  useEdgeFade(resolvedOuterRef, resolvedInnerRef, fadeSize, fadeColor);

  return (
    <div
      ref={resolvedOuterRef}
      className={cn("scroll-fade", outerClassName)}
      style={outerStyle}
    >
      <div
        ref={resolvedInnerRef}
        className={cn("overflow-auto", innerClassName)}
        style={innerStyle}
      >
        {children}
      </div>
    </div>
  );
}

export default ScrollFade;
