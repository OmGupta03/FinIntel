export const WATCHLIST_STORAGE_KEY = 'finintel_user_watchlist';
export const WATCHLIST_EVENT_NAME = 'finintel-watchlist-updated';

/**
 * Standardize ticker symbol for consistent comparison and storage.
 */
export function normalizeSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.trim().toUpperCase();
}

/**
 * Get all tracked stock symbols from localStorage. Defaults to an empty list.
 */
export function getWatchlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeSymbol).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error('Failed to read watchlist from localStorage:', err);
    return [];
  }
}

/**
 * Check if a symbol is currently in the watchlist.
 */
export function isInWatchlist(symbol: string): boolean {
  const norm = normalizeSymbol(symbol);
  if (!norm) return false;
  const list = getWatchlist();
  // Match exact or match without .NS/.BO suffix if applicable
  const base = norm.replace(/\.(NS|BO)$/, '');
  return list.some(item => {
    const itemNorm = normalizeSymbol(item);
    const itemBase = itemNorm.replace(/\.(NS|BO)$/, '');
    return itemNorm === norm || itemBase === base;
  });
}

function dispatchWatchlistUpdate(symbols: string[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(WATCHLIST_EVENT_NAME, { detail: { watchlist: symbols } })
    );
  }
}

/**
 * Add a stock symbol to the watchlist.
 */
export function addToWatchlist(symbol: string): string[] {
  const norm = normalizeSymbol(symbol);
  if (!norm) return getWatchlist();

  const current = getWatchlist();
  if (isInWatchlist(norm)) {
    return current;
  }

  const updated = [...current, norm];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
      dispatchWatchlistUpdate(updated);
    } catch (err) {
      console.error('Failed to save watchlist to localStorage:', err);
    }
  }
  return updated;
}

/**
 * Remove a stock symbol from the watchlist.
 */
export function removeFromWatchlist(symbol: string): string[] {
  const norm = normalizeSymbol(symbol);
  if (!norm) return getWatchlist();

  const base = norm.replace(/\.(NS|BO)$/, '');
  const current = getWatchlist();
  const updated = current.filter(item => {
    const itemNorm = normalizeSymbol(item);
    const itemBase = itemNorm.replace(/\.(NS|BO)$/, '');
    return itemNorm !== norm && itemBase !== base;
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
      dispatchWatchlistUpdate(updated);
    } catch (err) {
      console.error('Failed to update watchlist in localStorage:', err);
    }
  }
  return updated;
}

/**
 * Toggle a stock symbol in the watchlist. Returns true if added, false if removed.
 */
export function toggleWatchlist(symbol: string): boolean {
  if (isInWatchlist(symbol)) {
    removeFromWatchlist(symbol);
    return false;
  } else {
    addToWatchlist(symbol);
    return true;
  }
}

/**
 * Clear all stocks from the watchlist.
 */
export function clearWatchlist(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(WATCHLIST_STORAGE_KEY);
      dispatchWatchlistUpdate([]);
    } catch (err) {
      console.error('Failed to clear watchlist from localStorage:', err);
    }
  }
}

/**
 * Subscribe to watchlist updates across the app.
 */
export function subscribeWatchlist(callback: (symbols: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ watchlist: string[] }>;
    if (customEvent.detail?.watchlist) {
      callback(customEvent.detail.watchlist);
    } else {
      callback(getWatchlist());
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === WATCHLIST_STORAGE_KEY) {
      callback(getWatchlist());
    }
  };

  window.addEventListener(WATCHLIST_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(WATCHLIST_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
