import {
  normalizeMetadataString,
  type PdfCustomMetadataProperty,
  type PdfTrappedStatus,
  standardMetadataInfoKeys,
} from "@/features/pdf/lib/pdf-metadata";
import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

export type PdfDocumentMetadata = {
  author: string | null;
  creator: string | null;
  createdAt: Date | null;
  customProperties: PdfCustomMetadataProperty[];
  isProducerOverridden: boolean;
  keywords: string | null;
  language: string | null;
  modifiedAt: Date | null;
  producer: string | null;
  pdfVersion: string | null;
  subject: string | null;
  title: string | null;
  trapped: PdfTrappedStatus | null;
};

type RawPdfMetadataInfo = Record<string, unknown>;

type RawPdfMetadataResult = {
  info?: RawPdfMetadataInfo;
  metadata?: {
    get(name: string): unknown;
  } | null;
};

export async function getPdfDocumentMetadata(
  pdfDocument: PDFDocumentProxy,
): Promise<PdfDocumentMetadata> {
  const { info, metadata } =
    (await pdfDocument.getMetadata()) as unknown as RawPdfMetadataResult;

  return {
    author: getMetadataString(info, metadata, "Author", "dc:creator"),
    creator: getMetadataString(info, metadata, "Creator"),
    createdAt: getMetadataDate(info?.CreationDate),
    customProperties: getCustomMetadataProperties(info),
    isProducerOverridden: false,
    keywords: getMetadataString(info, metadata, "Keywords", "pdf:keywords"),
    language: getMetadataString(info, metadata, "Language"),
    modifiedAt: getMetadataDate(info?.ModDate),
    producer: getMetadataString(info, metadata, "Producer"),
    pdfVersion: getMetadataString(info, metadata, "PDFFormatVersion"),
    subject: getMetadataString(info, metadata, "Subject", "dc:description"),
    title: getMetadataString(info, metadata, "Title", "dc:title"),
    trapped: getMetadataTrappedStatus(info?.Trapped),
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

function getMetadataTrappedStatus(value: unknown): PdfTrappedStatus | null {
  const stringValue =
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string"
      ? value.name
      : normalizeMetadataString(value);

  if (
    stringValue === "True" ||
    stringValue === "False" ||
    stringValue === "Unknown"
  ) {
    return stringValue;
  }

  return null;
}

function getCustomMetadataProperties(info: RawPdfMetadataInfo | undefined) {
  const custom = info?.Custom;

  if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
    return [];
  }

  return Object.entries(custom).flatMap(([key, value]) => {
    if (standardMetadataInfoKeys.has(key)) {
      return [];
    }

    const normalizedValue = normalizeMetadataString(value);

    return normalizedValue == null ? [] : [{ key, value: normalizedValue }];
  });
}

function getMetadataDate(value: unknown) {
  const dateValue = typeof value === "string" ? parsePdfDate(value) : null;

  return dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null;
}

function parsePdfDate(value: string) {
  const match =
    /^D:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}'?\d{2}'?)?/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, offset] = match;
  const dateParts = {
    day: day ? Number.parseInt(day, 10) : 1,
    hour: hour ? Number.parseInt(hour, 10) : 0,
    minute: minute ? Number.parseInt(minute, 10) : 0,
    month: month ? Number.parseInt(month, 10) - 1 : 0,
    second: second ? Number.parseInt(second, 10) : 0,
    year: Number.parseInt(year, 10),
  };

  if (!offset) {
    return new Date(
      dateParts.year,
      dateParts.month,
      dateParts.day,
      dateParts.hour,
      dateParts.minute,
      dateParts.second,
    );
  }

  const utcTimestamp = Date.UTC(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second,
  );

  if (offset === "Z") {
    return new Date(utcTimestamp);
  }

  const offsetSign = offset[0] === "+" ? 1 : -1;
  const offsetHours = Number.parseInt(offset.slice(1, 3), 10);
  const offsetMinutes = Number.parseInt(
    offset.replaceAll("'", "").slice(3, 5),
    10,
  );
  const offsetMs = offsetSign * (offsetHours * 60 + offsetMinutes) * 60_000;

  return new Date(utcTimestamp - offsetMs);
}
