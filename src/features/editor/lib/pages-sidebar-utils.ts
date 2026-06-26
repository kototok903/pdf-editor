export function getSidebarThumbnailRenderPages({
  currentPage,
  intersectingPages,
  overscan,
  pageCount,
}: {
  currentPage: number;
  intersectingPages: Set<number>;
  overscan: number;
  pageCount: number;
}) {
  const pages = new Set<number>();

  for (const pageNumber of intersectingPages) {
    if (pageNumber >= 1 && pageNumber <= pageCount) {
      pages.add(pageNumber);
    }
  }

  const startPage = Math.max(1, currentPage - overscan);
  const endPage = Math.min(pageCount, currentPage + overscan);

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    pages.add(pageNumber);
  }

  return pages;
}
