import type {
  DocumentPageId,
  EditorFormEdits,
  PdfFormValue,
} from "@/features/editor/editor-types";

export type PdfFormFieldType = "Btn" | "Ch" | "Tx" | string;

export type PdfChoiceOption = {
  displayValue: string;
  exportValue: string;
};

export type PdfFormWidget = {
  buttonValue?: string;
  combo?: boolean;
  exportValue?: string;
  fieldName: string;
  fieldType: PdfFormFieldType;
  fieldValue: unknown;
  id: string;
  multiSelect?: boolean;
  options?: PdfChoiceOption[];
  pageId: DocumentPageId;
  pageNumber: number;
  readOnly: boolean;
  rect: [number, number, number, number];
};

export type PdfFormField =
  | {
      fieldName: string;
      fieldType: "text";
      pageNumbers: number[];
      readOnly: boolean;
      widgetIds: string[];
    }
  | {
      exportValues: string[];
      fieldName: string;
      fieldType: "checkbox";
      pageNumbers: number[];
      readOnly: boolean;
      widgetIds: string[];
    }
  | {
      fieldName: string;
      fieldType: "radio";
      options: string[];
      pageNumbers: number[];
      readOnly: boolean;
      widgetIds: string[];
    }
  | {
      combo: boolean;
      fieldName: string;
      fieldType: "choice";
      multiSelect: boolean;
      options: PdfChoiceOption[];
      pageNumbers: number[];
      readOnly: boolean;
      widgetIds: string[];
    }
  | {
      fieldName: string;
      fieldType: "unsupported";
      pageNumbers: number[];
      readOnly: boolean;
      widgetIds: string[];
    };

export type PdfFormFieldRegistry = {
  fields: PdfFormField[];
  fieldsByName: ReadonlyMap<string, PdfFormField>;
  widgetsById: ReadonlyMap<string, PdfFormWidget>;
};

type PdfJsAnnotation = {
  buttonValue?: unknown;
  combo?: unknown;
  exportValue?: unknown;
  fieldName?: unknown;
  fieldType?: unknown;
  fieldValue?: unknown;
  id?: unknown;
  multiSelect?: unknown;
  options?: unknown;
  readOnly?: unknown;
  rect?: unknown;
  subtype?: unknown;
};

type AnnotationStorageLike = {
  setValue: (key: string, value: object) => void;
};

export function extractPdfFormWidgets(
  annotations: PdfJsAnnotation[],
  pageNumber: number,
  pageId: DocumentPageId,
): PdfFormWidget[] {
  return annotations.flatMap((annotation) => {
    if (
      typeof annotation.id !== "string" ||
      typeof annotation.fieldName !== "string" ||
      typeof annotation.fieldType !== "string" ||
      !isPdfRect(annotation.rect)
    ) {
      return [];
    }

    return [
      {
        buttonValue:
          typeof annotation.buttonValue === "string"
            ? annotation.buttonValue
            : undefined,
        combo: typeof annotation.combo === "boolean" ? annotation.combo : false,
        exportValue:
          typeof annotation.exportValue === "string"
            ? annotation.exportValue
            : undefined,
        fieldName: annotation.fieldName,
        fieldType: annotation.fieldType,
        fieldValue: annotation.fieldValue,
        id: annotation.id,
        multiSelect:
          typeof annotation.multiSelect === "boolean"
            ? annotation.multiSelect
            : false,
        options: parseChoiceOptions(annotation.options),
        pageId,
        pageNumber,
        readOnly:
          typeof annotation.readOnly === "boolean"
            ? annotation.readOnly
            : false,
        rect: annotation.rect,
      },
    ];
  });
}

export function createPdfFormFieldRegistry(
  widgets: PdfFormWidget[],
): PdfFormFieldRegistry {
  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
  const widgetsByFieldName = new Map<string, PdfFormWidget[]>();

  for (const widget of widgets) {
    const fieldWidgets = widgetsByFieldName.get(widget.fieldName);

    if (fieldWidgets) {
      fieldWidgets.push(widget);
    } else {
      widgetsByFieldName.set(widget.fieldName, [widget]);
    }
  }

  const fields = Array.from(widgetsByFieldName, ([fieldName, fieldWidgets]) =>
    createPdfFormField(fieldName, fieldWidgets),
  );

  return {
    fields,
    fieldsByName: new Map(fields.map((field) => [field.fieldName, field])),
    widgetsById,
  };
}

export function applyFormEditsToAnnotationStorage({
  annotationStorage,
  formEdits,
  widgets,
}: {
  annotationStorage: AnnotationStorageLike;
  formEdits: EditorFormEdits;
  widgets: PdfFormWidget[];
}) {
  if (widgets.length === 0) {
    return;
  }

  const widgetsByFieldName = new Map<string, PdfFormWidget[]>();

  for (const widget of widgets) {
    const fieldWidgets = widgetsByFieldName.get(widget.fieldName);

    if (fieldWidgets) {
      fieldWidgets.push(widget);
    } else {
      widgetsByFieldName.set(widget.fieldName, [widget]);
    }
  }

  const formValuesByFieldName = new Map(
    formEdits.values.map((value) => [
      getPdfFormValueWidgetKey(value.pageId, value.fieldName),
      value,
    ]),
  );

  for (const [fieldName, fieldWidgets] of widgetsByFieldName) {
    const firstWidget = fieldWidgets[0];
    const value = firstWidget
      ? formValuesByFieldName.get(
          getPdfFormValueWidgetKey(firstWidget.pageId, fieldName),
        )
      : undefined;

    if (value) {
      applyFormValueToAnnotationStorage(annotationStorage, value, fieldWidgets);
    } else {
      for (const widget of fieldWidgets) {
        applyInitialWidgetValueToAnnotationStorage(annotationStorage, widget);
      }
    }
  }
}

export function syncFormControlsWithFormEdits({
  container,
  formEdits,
  widgets,
}: {
  container: HTMLElement;
  formEdits: EditorFormEdits;
  widgets: PdfFormWidget[];
}) {
  if (widgets.length === 0) {
    return;
  }

  const elementsByWidgetId = new Map(
    Array.from(
      container.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("[data-element-id]"),
    ).map((element) => [getFormElementWidgetId(element), element]),
  );
  const widgetsByFieldName = new Map<string, PdfFormWidget[]>();

  for (const widget of widgets) {
    const fieldWidgets = widgetsByFieldName.get(widget.fieldName);

    if (fieldWidgets) {
      fieldWidgets.push(widget);
    } else {
      widgetsByFieldName.set(widget.fieldName, [widget]);
    }
  }

  const formValuesByFieldName = new Map(
    formEdits.values.map((value) => [
      getPdfFormValueWidgetKey(value.pageId, value.fieldName),
      value,
    ]),
  );

  for (const [fieldName, fieldWidgets] of widgetsByFieldName) {
    const firstWidget = fieldWidgets[0];
    const value = firstWidget
      ? formValuesByFieldName.get(
          getPdfFormValueWidgetKey(firstWidget.pageId, fieldName),
        )
      : undefined;

    if (value) {
      syncFormValueToElements(value, fieldWidgets, elementsByWidgetId);
    } else {
      for (const widget of fieldWidgets) {
        const element = elementsByWidgetId.get(widget.id);

        if (element) {
          syncInitialWidgetValueToElement(widget, element);
        }
      }
    }
  }
}

export function createPdfFormValueFromElement({
  element,
  widget,
}: {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  widget: PdfFormWidget;
}): PdfFormValue | null {
  if (widget.readOnly) {
    return null;
  }

  if (element instanceof HTMLTextAreaElement) {
    return {
      fieldName: widget.fieldName,
      pageId: widget.pageId,
      type: "text",
      value: element.value,
    };
  }

  if (element instanceof HTMLSelectElement) {
    return {
      fieldName: widget.fieldName,
      pageId: widget.pageId,
      type: "choice",
      values: Array.from(element.selectedOptions, (option) => option.value),
    };
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      return {
        checked: element.checked,
        fieldName: widget.fieldName,
        pageId: widget.pageId,
        type: "checkbox",
      };
    }

    if (element.type === "radio") {
      return {
        fieldName: widget.fieldName,
        pageId: widget.pageId,
        selectedValue: element.checked ? (widget.buttonValue ?? null) : null,
        type: "radio",
      };
    }

    return {
      fieldName: widget.fieldName,
      pageId: widget.pageId,
      type: "text",
      value: element.value,
    };
  }

  return null;
}

export function getFormElementWidgetId(
  element: EventTarget | null,
): string | null {
  if (!(element instanceof Element)) {
    return null;
  }

  return element.getAttribute("data-element-id");
}

function getPdfFormValueWidgetKey(pageId: DocumentPageId, fieldName: string) {
  return `${pageId}:${fieldName}`;
}

function createPdfFormField(
  fieldName: string,
  widgets: PdfFormWidget[],
): PdfFormField {
  const pageNumbers = Array.from(
    new Set(widgets.map((widget) => widget.pageNumber)),
  );
  const widgetIds = widgets.map((widget) => widget.id);
  const readOnly = widgets.every((widget) => widget.readOnly);
  const firstWidget = widgets[0];

  if (!firstWidget) {
    return {
      fieldName,
      fieldType: "unsupported",
      pageNumbers,
      readOnly,
      widgetIds,
    };
  }

  if (firstWidget.fieldType === "Tx") {
    return {
      fieldName,
      fieldType: "text",
      pageNumbers,
      readOnly,
      widgetIds,
    };
  }

  if (firstWidget.fieldType === "Ch") {
    return {
      combo: widgets.some((widget) => widget.combo),
      fieldName,
      fieldType: "choice",
      multiSelect: widgets.some((widget) => widget.multiSelect),
      options: firstWidget.options ?? [],
      pageNumbers,
      readOnly,
      widgetIds,
    };
  }

  if (firstWidget.fieldType === "Btn") {
    const isRadio = widgets.some((widget) => widget.buttonValue);

    if (isRadio) {
      return {
        fieldName,
        fieldType: "radio",
        options: widgets.flatMap((widget) =>
          widget.buttonValue ? [widget.buttonValue] : [],
        ),
        pageNumbers,
        readOnly,
        widgetIds,
      };
    }

    return {
      exportValues: widgets.flatMap((widget) =>
        widget.exportValue ? [widget.exportValue] : [],
      ),
      fieldName,
      fieldType: "checkbox",
      pageNumbers,
      readOnly,
      widgetIds,
    };
  }

  return {
    fieldName,
    fieldType: "unsupported",
    pageNumbers,
    readOnly,
    widgetIds,
  };
}

function applyFormValueToAnnotationStorage(
  annotationStorage: AnnotationStorageLike,
  value: PdfFormValue,
  widgets: PdfFormWidget[],
) {
  switch (value.type) {
    case "checkbox":
      for (const widget of widgets) {
        annotationStorage.setValue(widget.id, {
          value: value.checked,
        });
      }
      break;
    case "choice":
      for (const widget of widgets) {
        annotationStorage.setValue(widget.id, {
          value: value.values,
        });
      }
      break;
    case "radio":
      for (const widget of widgets) {
        annotationStorage.setValue(widget.id, {
          value:
            value.selectedValue !== null &&
            widget.buttonValue === value.selectedValue,
        });
      }
      break;
    case "text":
      for (const widget of widgets) {
        annotationStorage.setValue(widget.id, {
          value: value.value,
        });
      }
      break;
  }
}

function applyInitialWidgetValueToAnnotationStorage(
  annotationStorage: AnnotationStorageLike,
  widget: PdfFormWidget,
) {
  switch (widget.fieldType) {
    case "Btn":
      annotationStorage.setValue(widget.id, {
        value: getInitialButtonWidgetChecked(widget),
      });
      break;
    case "Ch":
      annotationStorage.setValue(widget.id, {
        value: getInitialChoiceWidgetValues(widget),
      });
      break;
    case "Tx":
      annotationStorage.setValue(widget.id, {
        value: getInitialTextWidgetValue(widget),
      });
      break;
  }
}

function syncFormValueToElements(
  value: PdfFormValue,
  widgets: PdfFormWidget[],
  elementsByWidgetId: ReadonlyMap<
    string | null,
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) {
  switch (value.type) {
    case "checkbox":
      for (const widget of widgets) {
        const element = elementsByWidgetId.get(widget.id);

        if (element instanceof HTMLInputElement) {
          setInputChecked(element, value.checked);
        }
      }
      break;
    case "choice":
      for (const widget of widgets) {
        const element = elementsByWidgetId.get(widget.id);

        if (element instanceof HTMLSelectElement) {
          setSelectValues(element, value.values);
        }
      }
      break;
    case "radio":
      for (const widget of widgets) {
        const element = elementsByWidgetId.get(widget.id);

        if (element instanceof HTMLInputElement) {
          setInputChecked(
            element,
            value.selectedValue !== null &&
              widget.buttonValue === value.selectedValue,
          );
        }
      }
      break;
    case "text":
      for (const widget of widgets) {
        const element = elementsByWidgetId.get(widget.id);

        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          setTextControlValue(element, value.value);
        }
      }
      break;
  }
}

function syncInitialWidgetValueToElement(
  widget: PdfFormWidget,
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  switch (widget.fieldType) {
    case "Btn":
      if (element instanceof HTMLInputElement) {
        setInputChecked(element, getInitialButtonWidgetChecked(widget));
      }
      break;
    case "Ch":
      if (element instanceof HTMLSelectElement) {
        setSelectValues(element, getInitialChoiceWidgetValues(widget));
      }
      break;
    case "Tx":
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        setTextControlValue(element, getInitialTextWidgetValue(widget));
      }
      break;
  }
}

function setTextControlValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  if (element === document.activeElement || element.value === value) {
    return;
  }

  element.value = value;
}

function setInputChecked(element: HTMLInputElement, checked: boolean) {
  if (element.checked === checked) {
    return;
  }

  element.checked = checked;
}

function setSelectValues(element: HTMLSelectElement, values: string[]) {
  if (element === document.activeElement) {
    return;
  }

  const selectedValues = new Set(values);
  let didChange = false;

  for (const option of element.options) {
    const selected = selectedValues.has(option.value);

    if (option.selected !== selected) {
      option.selected = selected;
      didChange = true;
    }
  }

  if (!didChange && values.length === 0 && element.selectedIndex !== -1) {
    element.selectedIndex = -1;
  }
}

function getInitialTextWidgetValue(widget: PdfFormWidget) {
  return typeof widget.fieldValue === "string" ? widget.fieldValue : "";
}

function getInitialChoiceWidgetValues(widget: PdfFormWidget) {
  if (Array.isArray(widget.fieldValue)) {
    return widget.fieldValue.filter((value) => typeof value === "string");
  }

  if (typeof widget.fieldValue === "string" && widget.fieldValue !== "") {
    return [widget.fieldValue];
  }

  return [];
}

function getInitialButtonWidgetChecked(widget: PdfFormWidget) {
  if (typeof widget.fieldValue === "boolean") {
    return widget.fieldValue;
  }

  if (widget.buttonValue) {
    return widget.fieldValue === widget.buttonValue;
  }

  return Boolean(
    widget.exportValue &&
    widget.fieldValue !== "Off" &&
    widget.fieldValue === widget.exportValue,
  );
}

function parseChoiceOptions(options: unknown): PdfChoiceOption[] | undefined {
  if (!Array.isArray(options)) {
    return undefined;
  }

  return options.flatMap((option) => {
    if (
      option &&
      typeof option === "object" &&
      "displayValue" in option &&
      "exportValue" in option &&
      typeof option.displayValue === "string" &&
      typeof option.exportValue === "string"
    ) {
      return [
        {
          displayValue: option.displayValue,
          exportValue: option.exportValue,
        },
      ];
    }

    return [];
  });
}

function isPdfRect(rect: unknown): rect is [number, number, number, number] {
  return (
    Array.isArray(rect) &&
    rect.length === 4 &&
    rect.every((value) => typeof value === "number")
  );
}
