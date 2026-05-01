type PagesSidebarProps = {
  currentPage: number;
  pageCount: number;
};

function PagesSidebar({ currentPage, pageCount }: PagesSidebarProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <aside className="flex h-[calc(100vh-3rem)] w-20 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border p-2">
        <div className="flex items-center justify-between text-xs">
          <span>Page</span>
          <span className="text-muted-foreground">
            {pageCount > 0 ? `${currentPage}/${pageCount}` : "0/0"}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-2">
        {pages.length > 0 ? (
          pages.map((page) => (
            <button
              className="grid h-20 w-full place-items-center rounded-md border bg-page text-xs text-page-foreground shadow-sm data-[active=true]:border-2 data-[active=true]:border-primary"
              data-active={page === currentPage}
              key={page}
              type="button"
            >
              {page}
            </button>
          ))
        ) : (
          <div className="h-20 rounded-md border border-dashed bg-page/70" />
        )}
      </div>
    </aside>
  );
}

export { PagesSidebar };
