import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnnotationLayer, setLayerDimensions } from "pdfjs-dist";

import type {
  EditorFormEdits,
  PdfFormValue,
} from "@/features/editor/editor-types";
import {
  applyFormEditsToAnnotationStorage,
  createPdfFormValueFromElement,
  extractPdfFormWidgets,
  getFormElementWidgetId,
  syncFormControlsWithFormEdits,
  type PdfFormWidget,
} from "@/features/pdf/lib/pdf-form-metadata";
import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";
import "@/features/pdf/components/pdf-annotation-layer.css";

type PdfAnnotationLayerProps = {
  formEdits: EditorFormEdits;
  onCommitFormValue: (value: PdfFormValue) => void;
  onFormWidgetsChange: (pageNumber: number, widgets: PdfFormWidget[]) => void;
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  scale: number;
  shouldRender: boolean;
};

const PdfAnnotationLayer = memo(function PdfAnnotationLayer({
  formEdits,
  onCommitFormValue,
  onFormWidgetsChange,
  pageNumber,
  pdfDocument,
  scale,
  shouldRender,
}: PdfAnnotationLayerProps) {
  const annotationLayerRef = useRef<HTMLDivElement | null>(null);
  const formEditsRef = useRef(formEdits);
  const [widgets, setWidgets] = useState<PdfFormWidget[]>(emptyFormWidgets);
  const widgetsById = useMemo(
    () => new Map(widgets.map((widget) => [widget.id, widget])),
    [widgets],
  );

  formEditsRef.current = formEdits;

  useEffect(() => {
    const container = annotationLayerRef.current;
    let isCancelled = false;

    if (!container) {
      return;
    }

    const annotationLayerContainer = container;

    annotationLayerContainer.replaceChildren();
    setWidgets(emptyFormWidgets);
    onFormWidgetsChange(pageNumber, emptyFormWidgets);

    if (!shouldRender) {
      return;
    }

    async function renderAnnotationLayer() {
      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (isCancelled) {
          return;
        }

        const viewport = page.getViewport({ scale });
        const annotations = await page.getAnnotations({ intent: "display" });

        if (isCancelled) {
          return;
        }

        const nextWidgets = extractPdfFormWidgets(annotations, pageNumber);

        applyFormEditsToAnnotationStorage({
          annotationStorage: pdfDocument.annotationStorage,
          formEdits: formEditsRef.current,
          widgets: nextWidgets,
        });

        annotationLayerContainer.style.setProperty(
          "--scale-factor",
          `${viewport.scale}`,
        );
        annotationLayerContainer.style.setProperty(
          "--user-unit",
          `${viewport.userUnit}`,
        );
        annotationLayerContainer.style.setProperty(
          "--total-scale-factor",
          "calc(var(--scale-factor) * var(--user-unit))",
        );
        setLayerDimensions(annotationLayerContainer, viewport);

        const annotationLayer = new AnnotationLayer({
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          annotationStorage: pdfDocument.annotationStorage,
          commentManager: null,
          div: annotationLayerContainer,
          linkService: pdfAnnotationLinkService,
          page,
          structTreeLayer: null,
          viewport,
        });

        await annotationLayer.render({
          annotationStorage: pdfDocument.annotationStorage,
          annotations,
          div: annotationLayerContainer,
          enableScripting: false,
          linkService: pdfAnnotationLinkService as never,
          page,
          renderForms: true,
          viewport,
        });

        if (!isCancelled) {
          setWidgets(nextWidgets);
          onFormWidgetsChange(pageNumber, nextWidgets);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof Error && error.name === "AbortException") {
          return;
        }

        annotationLayerContainer.replaceChildren();
        setWidgets(emptyFormWidgets);
        onFormWidgetsChange(pageNumber, emptyFormWidgets);
      }
    }

    void renderAnnotationLayer();

    return () => {
      isCancelled = true;
      annotationLayerContainer.replaceChildren();
      setWidgets(emptyFormWidgets);
      onFormWidgetsChange(pageNumber, emptyFormWidgets);
    };
  }, [onFormWidgetsChange, pageNumber, pdfDocument, scale, shouldRender]);

  useEffect(() => {
    const container = annotationLayerRef.current;

    if (!container || widgets.length === 0) {
      return;
    }

    applyFormEditsToAnnotationStorage({
      annotationStorage: pdfDocument.annotationStorage,
      formEdits,
      widgets,
    });
    syncFormControlsWithFormEdits({
      container,
      formEdits,
      widgets,
    });
  }, [formEdits, pdfDocument, widgets]);

  useEffect(() => {
    const container = annotationLayerRef.current;

    if (!container) {
      return;
    }

    const commitFormValue = (target: EventTarget | null) => {
      const widgetId = getFormElementWidgetId(target);
      const widget = widgetId ? widgetsById.get(widgetId) : null;

      if (
        !widget ||
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }

      const value = createPdfFormValueFromElement({
        element: target,
        widget,
      });

      if (value) {
        onCommitFormValue(value);
      }
    };

    const handleChange = (event: Event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.type !== "checkbox" &&
        event.target.type !== "radio"
      ) {
        return;
      }

      commitFormValue(event.target);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        commitFormValue(event.target);
      }
    };

    container.addEventListener("change", handleChange);
    container.addEventListener("focusout", handleFocusOut);

    return () => {
      container.removeEventListener("change", handleChange);
      container.removeEventListener("focusout", handleFocusOut);
    };
  }, [onCommitFormValue, widgetsById]);

  return (
    <div
      aria-hidden="false"
      className="annotationLayer"
      ref={annotationLayerRef}
    />
  );
});

PdfAnnotationLayer.displayName = "PdfAnnotationLayer";

const emptyFormWidgets: PdfFormWidget[] = [];

const pdfAnnotationLinkService = {
  addLinkAttributes(
    link: HTMLAnchorElement,
    {
      enabled = true,
      url,
    }: {
      enabled?: boolean;
      url?: string | null;
    } = {},
  ) {
    if (!enabled || !url) {
      link.removeAttribute("href");
      return;
    }

    link.href = url;
    link.rel = "noopener noreferrer nofollow";
    link.target = "_blank";
  },
  eventBus: null,
  executeNamedAction() {
    // Navigation actions are out of scope for the form layer integration.
  },
  executeSetOCGState() {
    // Optional content group actions are out of scope for this editor.
  },
  getAnchorUrl(hash: string) {
    return hash;
  },
  getDestinationHash() {
    return "";
  },
  goToDestination() {
    // Internal link navigation can be wired separately from form filling.
  },
};

export { PdfAnnotationLayer };
