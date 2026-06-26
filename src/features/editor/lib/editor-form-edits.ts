import type {
  EditorFormEdits,
  PdfFormValue,
} from "@/features/editor/editor-types";

export const emptyEditorFormEdits: EditorFormEdits = {
  values: [],
};

export function normalizeEditorFormEdits(
  formEdits: EditorFormEdits | null | undefined,
): EditorFormEdits {
  if (
    !formEdits ||
    !Array.isArray(formEdits.values) ||
    formEdits.values.length === 0
  ) {
    return emptyEditorFormEdits;
  }

  return {
    values: formEdits.values,
  };
}

export function cloneEditorFormEdits(
  formEdits: EditorFormEdits | null | undefined,
): EditorFormEdits {
  const normalizedFormEdits = normalizeEditorFormEdits(formEdits);

  if (normalizedFormEdits.values.length === 0) {
    return emptyEditorFormEdits;
  }

  return {
    values: normalizedFormEdits.values.map(clonePdfFormValue),
  };
}

export function updatePdfFormValue(
  formEdits: EditorFormEdits,
  value: PdfFormValue,
): EditorFormEdits {
  const valueKey = getPdfFormValueKey(value);
  let didReplace = false;
  const nextValues = formEdits.values.map((currentValue) => {
    if (getPdfFormValueKey(currentValue) !== valueKey) {
      return currentValue;
    }

    didReplace = true;
    return arePdfFormValuesEqual(currentValue, value) ? currentValue : value;
  });

  if (!didReplace) {
    return {
      values: [...formEdits.values, value],
    };
  }

  if (
    nextValues.length === formEdits.values.length &&
    nextValues.every(
      (nextValue, index) => nextValue === formEdits.values[index],
    )
  ) {
    return formEdits;
  }

  return {
    values: nextValues,
  };
}

export function getPdfFormValue(formEdits: EditorFormEdits, valueKey: string) {
  return formEdits.values.find(
    (value) => getPdfFormValueKey(value) === valueKey,
  );
}

export function getPdfFormValueKey(
  value: Pick<PdfFormValue, "fieldName" | "pageId" | "type">,
) {
  return `${value.pageId}:${value.type}:${value.fieldName}`;
}

export function areEditorFormEditsEqual(
  left: EditorFormEdits | null | undefined,
  right: EditorFormEdits | null | undefined,
) {
  if (left === right) {
    return true;
  }

  const normalizedLeft = normalizeEditorFormEdits(left);
  const normalizedRight = normalizeEditorFormEdits(right);

  if (normalizedLeft.values.length !== normalizedRight.values.length) {
    return false;
  }

  const rightValuesByKey = new Map(
    normalizedRight.values.map((value) => [getPdfFormValueKey(value), value]),
  );

  return normalizedLeft.values.every((leftValue) => {
    const rightValue = rightValuesByKey.get(getPdfFormValueKey(leftValue));

    return rightValue ? arePdfFormValuesEqual(leftValue, rightValue) : false;
  });
}

export function arePdfFormValuesEqual(left: PdfFormValue, right: PdfFormValue) {
  if (left === right) {
    return true;
  }

  if (
    left.type !== right.type ||
    left.fieldName !== right.fieldName ||
    left.pageId !== right.pageId
  ) {
    return false;
  }

  switch (left.type) {
    case "checkbox":
      return right.type === "checkbox" && left.checked === right.checked;
    case "choice":
      return (
        right.type === "choice" &&
        areStringArraysEqual(left.values, right.values)
      );
    case "radio":
      return (
        right.type === "radio" && left.selectedValue === right.selectedValue
      );
    case "text":
      return right.type === "text" && left.value === right.value;
  }
}

function clonePdfFormValue(value: PdfFormValue): PdfFormValue {
  if (value.type === "choice") {
    return {
      ...value,
      values: [...value.values],
    };
  }

  return { ...value };
}

function areStringArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((leftValue, index) => leftValue === right[index])
  );
}
