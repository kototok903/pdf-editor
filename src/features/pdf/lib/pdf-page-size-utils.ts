import type { PageSize } from "@/features/pdf/pdf-types";

function isPageInRenderWindow({
  currentPage,
  overscan,
  pageNumber,
}: {
  currentPage: number;
  overscan: number;
  pageNumber: number;
}) {
  return Math.abs(pageNumber - currentPage) <= overscan;
}

function scalePageSize(pageSize: PageSize, scale: number): PageSize {
  return {
    height: pageSize.height * scale,
    width: pageSize.width * scale,
  };
}

function scalePageSizes(
  pageSizes: Record<number, PageSize>,
  scale: number,
): Record<number, PageSize> {
  return Object.fromEntries(
    Object.entries(pageSizes).map(([pageNumber, pageSize]) => [
      pageNumber,
      scalePageSize(pageSize, scale),
    ]),
  );
}

export { isPageInRenderWindow, scalePageSize, scalePageSizes };
