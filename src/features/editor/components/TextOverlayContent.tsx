import { useEffect, useLayoutEffect, useRef } from "react";

import type { TextOverlay } from "@/features/editor/editor-types";
import { getTextFontFamily } from "@/features/editor/lib/text-fonts";
import { cn } from "@/lib/utils";

type TextOverlayContentProps = {
  isEditing: boolean;
  isSelected: boolean;
  onHeightChange: (height: number) => void;
  onTextChange: (text: string) => void;
  overlay: TextOverlay;
  scale: number;
};

function TextOverlayContent({
  isEditing,
  isSelected,
  onHeightChange,
  onTextChange,
  overlay,
  scale,
}: TextOverlayContentProps) {
  const displayRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const className = cn(
    "block h-full w-full overflow-hidden border-0 bg-transparent p-0 font-normal outline -outline-offset-1 outline-transparent wrap-anywhere",
    !isSelected && "hover:outline-primary/50",
    isSelected && "outline-primary",
    isEditing && "ring-2 ring-primary/25",
  );

  const style = {
    color: overlay.color,
    fontFamily: getTextFontFamily(overlay.fontId),
    fontSize: overlay.fontSize * scale,
    lineHeight: textOverlayLineHeight,
    minHeight: getMinimumTextOverlayHeight(overlay.fontSize, scale),
    fontSynthesisWeight: "none" as const,
  };

  useLayoutEffect(() => {
    const element =
      isEditing && shouldRenderDisplayLinePlaceholder(overlay.text)
        ? measureRef.current
        : isEditing
          ? textAreaRef.current
          : displayRef.current;

    if (!element) {
      return;
    }

    const measuredHeight = getMeasuredTextOverlayHeight(
      element,
      style.minHeight,
    );
    let isCancelled = false;

    queueMicrotask(() => {
      if (!isCancelled) {
        onHeightChange(measuredHeight);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    isEditing,
    onHeightChange,
    overlay.fontId,
    overlay.fontSize,
    overlay.rect.width,
    overlay.text,
    scale,
    style.minHeight,
  ]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    let editedTextArea: HTMLTextAreaElement | null = null;
    const frameId = requestAnimationFrame(() => {
      const textArea = textAreaRef.current;

      if (!textArea) {
        return;
      }

      editedTextArea = textArea;
      textArea.focus();
      textArea.setSelectionRange(0, textArea.value.length);
    });

    return () => {
      cancelAnimationFrame(frameId);
      editedTextArea?.setSelectionRange(
        editedTextArea.value.length,
        editedTextArea.value.length,
      );
      editedTextArea?.blur();
      window.getSelection()?.removeAllRanges();
    };
  }, [isEditing]);

  if (!isEditing) {
    return (
      <div
        className={cn(className, "whitespace-pre-wrap")}
        ref={displayRef}
        style={style}
      >
        {overlay.text}
        {shouldRenderDisplayLinePlaceholder(overlay.text) && (
          <span aria-hidden className="invisible">
            M
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <textarea
        aria-label="Text overlay"
        autoFocus
        className={cn(className, "resize-none")}
        onChange={(event) => onTextChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        ref={textAreaRef}
        rows={1}
        spellCheck={false}
        style={style}
        value={overlay.text}
      />
      <div
        aria-hidden
        className={cn(
          className,
          "pointer-events-none invisible absolute left-0 top-0 h-auto whitespace-pre-wrap",
        )}
        ref={measureRef}
        style={style}
      >
        {overlay.text}
        {shouldRenderDisplayLinePlaceholder(overlay.text) && (
          <span className="invisible">M</span>
        )}
      </div>
    </>
  );
}

const textOverlayLineHeight = 1.25;

function getMinimumTextOverlayHeight(fontSize: number, scale: number) {
  return fontSize * scale * textOverlayLineHeight;
}

function getMeasuredTextOverlayHeight(
  element: HTMLDivElement | HTMLTextAreaElement,
  minimumHeight: number,
) {
  const originalHeight = element.style.height;

  element.style.height = "auto";
  const measuredHeight = element.scrollHeight;
  element.style.height = originalHeight;

  return Math.max(minimumHeight, Math.ceil(measuredHeight));
}

function shouldRenderDisplayLinePlaceholder(text: string) {
  return text === "" || text.endsWith("\n");
}

export { TextOverlayContent };
