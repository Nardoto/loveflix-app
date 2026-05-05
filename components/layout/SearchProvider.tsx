'use client';

// Lifts SearchOverlay state out of TopBar so multiple triggers (TopBar
// search icon + bottom tab "Buscar") can open the same overlay without
// prop drilling or events. Mounted once at the locale layout level.

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { SearchOverlay } from './SearchOverlay';

type SearchCtx = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const SearchContext = createContext<SearchCtx>({
  open: false,
  openSearch: () => {},
  closeSearch: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  return (
    <SearchContext.Provider value={{ open, openSearch, closeSearch }}>
      {children}
      <SearchOverlay open={open} onClose={closeSearch} />
    </SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext);
