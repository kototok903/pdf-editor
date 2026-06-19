import { PDFDateString } from "pdfjs-dist";

import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

type PdfDocumentMetadata = {
  application: string | null;
  author: string | null;
  createdAt: Date | null;
  keywords: string | null;
  modifiedAt: Date | null;
  pdfProducer: string | null;
  pdfVersion: string | null;
  subject: string | null;
  title: string | null;
};

type RawPdfMetadataResult = {
  info?: Record<string, unknown>;
  metadata?: {
    get(name: string): unknown;
  } | null;
};

async function getPdfDocumentMetadata(
  pdfDocument: PDFDocumentProxy,
): Promise<PdfDocumentMetadata> {
  const { info, metadata } =
    (await pdfDocument.getMetadata()) as unknown as RawPdfMetadataResult;

  return {
    application: getMetadataString(info, metadata, "Creator"),
    author: getMetadataString(info, metadata, "Author", "dc:creator"),
    createdAt: getMetadataDate(info?.CreationDate),
    keywords: getMetadataString(info, metadata, "Keywords", "pdf:keywords"),
    modifiedAt: getMetadataDate(info?.ModDate),
    pdfProducer: getMetadataString(info, metadata, "Producer"),
    pdfVersion: getMetadataString(info, metadata, "PDFFormatVersion"),
    subject: getMetadataString(info, metadata, "Subject", "dc:description"),
    title: getMetadataString(info, metadata, "Title", "dc:title"),
  };
}

function getMetadataString(
  info: Record<string, unknown> | undefined,
  metadata: RawPdfMetadataResult["metadata"],
  infoKey: string,
  xmpKey?: string,
) {
  return normalizeMetadataString(
    info?.[infoKey] ?? metadata?.get(xmpKey ?? ""),
  );
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

function getMetadataDate(value: unknown) {
  const dateValue =
    typeof value === "string" ? PDFDateString.toDateObject(value) : null;

  return dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null;
}

export { getPdfDocumentMetadata };
export type { PdfDocumentMetadata };
