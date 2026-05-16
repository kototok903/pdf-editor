type PageViewportBounds = {
  bottom: number;
  pageNumber: number;
  top: number;
};

function findCenteredPageNumber({
  fallbackPage,
  pages,
  viewportHeight,
  viewportTop,
}: {
  fallbackPage: number;
  pages: PageViewportBounds[];
  viewportHeight: number;
  viewportTop: number;
}) {
  const viewportCenter = viewportTop + viewportHeight / 2;
  let closestPage = fallbackPage;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const page of pages) {
    const distance =
      viewportCenter < page.top
        ? page.top - viewportCenter
        : viewportCenter > page.bottom
          ? viewportCenter - page.bottom
          : 0;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestPage = page.pageNumber;
    }
  }

  return closestPage;
}

function getScrollTopForPage({
  containerScrollTop,
  containerTop,
  pageTop,
  topSpacing,
}: {
  containerScrollTop: number;
  containerTop: number;
  pageTop: number;
  topSpacing: number;
}) {
  return Math.max(0, containerScrollTop + pageTop - containerTop - topSpacing);
}

function shouldApplyCenteredPageFromScroll({
  centeredPage,
  currentPage,
  programmaticScrollTargetPage,
}: {
  centeredPage: number;
  currentPage: number;
  programmaticScrollTargetPage: number | null;
}) {
  return programmaticScrollTargetPage === null && centeredPage !== currentPage;
}

export {
  findCenteredPageNumber,
  getScrollTopForPage,
  shouldApplyCenteredPageFromScroll,
};
export type { PageViewportBounds };
