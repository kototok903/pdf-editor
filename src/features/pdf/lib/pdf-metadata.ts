type PdfTrappedStatus = "True" | "False" | "Unknown";

type PdfCustomMetadataProperty = {
  key: string;
  value: string;
};

type PdfProjectMetadata = {
  author: string | null;
  creator: string | null;
  customProperties: PdfCustomMetadataProperty[];
  isProducerOverridden: boolean;
  keywords: string | null;
  language: string | null;
  producer: string | null;
  subject: string | null;
  title: string | null;
  trapped: PdfTrappedStatus | null;
};

const standardMetadataInfoKeys = new Set([
  "Title",
  "Author",
  "Subject",
  "Keywords",
  "Creator",
  "Producer",
  "CreationDate",
  "ModDate",
  "Trapped",
  "Language",
  "PDFFormatVersion",
  "IsAcroFormPresent",
  "IsXFAPresent",
  "IsCollectionPresent",
  "IsSignaturesPresent",
  "IsLinearized",
]);

const emptyPdfProjectMetadata: PdfProjectMetadata = {
  author: null,
  creator: null,
  customProperties: [],
  isProducerOverridden: false,
  keywords: null,
  language: null,
  producer: null,
  subject: null,
  title: null,
  trapped: null,
};

function createPdfProjectMetadata(
  metadata:
    | (PdfProjectMetadata & {
        createdAt?: Date | null;
        modifiedAt?: Date | null;
        pdfVersion?: string | null;
      })
    | null,
): PdfProjectMetadata {
  return clonePdfProjectMetadata({
    ...emptyPdfProjectMetadata,
    ...metadata,
    customProperties: metadata?.customProperties ?? [],
    isProducerOverridden: metadata?.isProducerOverridden ?? false,
  });
}

function clonePdfProjectMetadata(
  metadata: PdfProjectMetadata,
): PdfProjectMetadata {
  return {
    ...metadata,
    customProperties: metadata.customProperties.map((property) => ({
      key: property.key,
      value: property.value,
    })),
  };
}

function normalizePdfProjectMetadata(
  metadata: PdfProjectMetadata,
): PdfProjectMetadata {
  return {
    author: normalizeMetadataString(metadata.author),
    creator: normalizeMetadataString(metadata.creator),
    customProperties: metadata.customProperties
      .map((property) => ({
        key: property.key.trim(),
        value: property.value,
      }))
      .filter((property) => property.key.length > 0),
    isProducerOverridden: metadata.isProducerOverridden,
    keywords: normalizeMetadataString(metadata.keywords),
    language: normalizeMetadataString(metadata.language),
    producer: normalizeMetadataString(metadata.producer),
    subject: normalizeMetadataString(metadata.subject),
    title: normalizeMetadataString(metadata.title),
    trapped: metadata.trapped,
  };
}

function normalizeMetadataString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  if (Array.isArray(value)) {
    return normalizeMetadataString(value.join(", "));
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

export {
  clonePdfProjectMetadata,
  createPdfProjectMetadata,
  emptyPdfProjectMetadata,
  normalizeMetadataString,
  normalizePdfProjectMetadata,
  standardMetadataInfoKeys,
};
export type { PdfCustomMetadataProperty, PdfProjectMetadata, PdfTrappedStatus };
