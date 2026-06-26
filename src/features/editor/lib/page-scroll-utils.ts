export type PageViewportBounds = {
  bottom: number;
  pageNumber: number;
  top: number;
};

export function findCenteredPageNumber({
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

export function shouldApplyCenteredPageFromScroll({
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

export function shouldHandleScrollToPageRequest({
  handledRequestId,
  hasPageElement,
  hasWorkspace,
  requestId,
}: {
  handledRequestId: number | null;
  hasPageElement: boolean;
  hasWorkspace: boolean;
  requestId: number;
}) {
  return handledRequestId !== requestId && hasPageElement && hasWorkspace;
}
