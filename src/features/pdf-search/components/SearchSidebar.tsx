import { CaseSensitiveIcon, SearchIcon, WholeWordIcon } from "lucide-react";
import { memo, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  PdfSearchMatch,
  PdfSearchPageGroup,
} from "@/features/pdf-search/pdf-search-types";
import { cn } from "@/lib/utils";

type SearchSidebarProps = {
  activeMatchId: string | null;
  groups: PdfSearchPageGroup[];
  isSearching: boolean;
  matchCase: boolean;
  query: string;
  resultCount: number;
  wholeWord: boolean;
  onMatchCaseChange: (enabled: boolean) => void;
  onQueryChange: (query: string) => void;
  onResultClick: (match: PdfSearchMatch) => void;
  onWholeWordChange: (enabled: boolean) => void;
};

export const SearchSidebar = memo(function SearchSidebar({
  activeMatchId,
  groups,
  isSearching,
  matchCase,
  onMatchCaseChange,
  onQueryChange,
  onResultClick,
  onWholeWordChange,
  query,
  resultCount,
  wholeWord,
}: SearchSidebarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const trimmedQuery = query.trim();

  return (
    <aside className="flex h-full w-70 shrink-0 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border p-2">
        <InputGroup className="h-8 bg-background">
          <InputGroupInput
            aria-label="Search PDF"
            className="text-sm"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search..."
            value={query}
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end" className="gap-0.5">
            <Tooltip tooltip="Match case" side="bottom">
              <Toggle
                aria-label="Match case"
                className="size-6 aria-pressed:border aria-pressed:border-input"
                onPressedChange={onMatchCaseChange}
                pressed={matchCase}
                size="sm"
                type="button"
              >
                <CaseSensitiveIcon aria-hidden className="size-4" />
              </Toggle>
            </Tooltip>
            <Tooltip tooltip="Match whole word" side="bottom">
              <Toggle
                aria-label="Match whole word"
                className="size-6 aria-pressed:border aria-pressed:border-input"
                onPressedChange={onWholeWordChange}
                pressed={wholeWord}
                size="sm"
                type="button"
              >
                <WholeWordIcon aria-hidden className="size-4" />
              </Toggle>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </div>
      {trimmedQuery && (
        <div
          className={cn(
            "p-2 text-xs text-muted-foreground",
            isScrolled ? "border-b border-sidebar-border" : "",
          )}
        >
          {isSearching
            ? "Searching..."
            : resultCount === 0
              ? "No results"
              : `${resultCount} ${resultCount === 1 ? "result" : "results"}`}
        </div>
      )}
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-2 pd-2"
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
      >
        {groups.map((group) => (
          <SearchResultPageGroup
            activeMatchId={activeMatchId}
            group={group}
            key={group.pageNumber}
            onResultClick={onResultClick}
          />
        ))}
      </div>
    </aside>
  );
});

SearchSidebar.displayName = "SearchSidebar";

const SearchResultPageGroup = memo(function SearchResultPageGroup({
  activeMatchId,
  group,
  onResultClick,
}: {
  activeMatchId: string | null;
  group: PdfSearchPageGroup;
  onResultClick: (match: PdfSearchMatch) => void;
}) {
  const isActive = group.matches.some((match) => match.id === activeMatchId);

  return (
    <div
      className="relative block overflow-hidden rounded-md border-2 border-border text-page-foreground shadow-sm transition-colors data-[active=true]:border-primary"
      data-active={isActive}
    >
      <div
        className="divide-y-2 divide-border data-[active=true]:divide-primary"
        data-active={isActive}
      >
        {group.matches.map((match) => (
          <button
            className={cn(
              "block w-full px-2 py-1.5 text-left text-sm leading-snug outline-none transition-colors bg-page hover:bg-page/95 focus-visible:bg-page/95",
              "data-[active=true]:bg-[color-mix(in_srgb,var(--page-active)_80%,var(--page))] data-[active=true]:hover:bg-[color-mix(in_srgb,var(--page-active)_70%,var(--page))] data-[active=true]:focus-visible:bg-[color-mix(in_srgb,var(--page-active)_70%,var(--page))]",
              "outline-none focus-visible:ring-inset focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
            key={match.id}
            onClick={() => onResultClick(match)}
            type="button"
            data-active={match.id === activeMatchId}
          >
            {match.snippetParts.map((part, index) => (
              <span
                className={part.isMatch ? "font-semibold text-primary" : ""}
                key={`${match.id}-${index}`}
              >
                {part.text}
              </span>
            ))}
          </button>
        ))}
      </div>
      <span
        className={cn(
          "absolute right-0 top-0 -mr-px -mt-px min-w-5 rounded-bl-lg bg-toolbar-button px-1 py-0.5 text-center text-xs leading-none font-semibold text-toolbar-foreground transition-colors ring-2 ring-border",
          "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:ring-primary",
        )}
        data-active={isActive}
      >
        {group.pageNumber}
      </span>
    </div>
  );
});

SearchResultPageGroup.displayName = "SearchResultPageGroup";
