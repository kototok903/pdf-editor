import { useEffect, useRef } from "react";

import type { TextOverlay } from "@/features/editor/editor-types";
import { getTextFontFamily } from "@/features/editor/lib/text-fonts";
import { cn } from "@/lib/utils";

type TextOverlayContentProps = {
  isEditing: boolean;
  isSelected: boolean;
  onTextChange: (text: string) => void;
  overlay: TextOverlay;
  scale: number;
};

function TextOverlayContent({
  isEditing,
  isSelected,
  onTextChange,
  overlay,
  scale,
}: TextOverlayContentProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const className = cn(
    "h-full w-full overflow-hidden border-0 bg-transparent p-0 font-normal leading-tight outline -outline-offset-1 outline-transparent",
    !isSelected && "hover:outline-primary/50",
    isSelected && "outline-primary",
    isEditing && "ring-2 ring-primary/25",
  );

  const style = {
    color: overlay.color,
    fontFamily: getTextFontFamily(overlay.fontId),
    fontSize: overlay.fontSize * scale,
    fontSynthesisWeight: "none" as const,
  };

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
      <div className={cn(className, "whitespace-pre-wrap")} style={style}>
        {overlay.text}
      </div>
    );
  }

  return (
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
      spellCheck={false}
      style={style}
      value={overlay.text}
    />
  );
}

export { TextOverlayContent };
