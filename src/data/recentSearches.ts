import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recent_searches';
const MAX_RECENT = 8;

// Real per-device search history, replacing search-content.ts's old hardcoded mock list
// (['carrots case', 'lamb chops', ...] - leftover demo strings nobody actually searched).
// Persisted via AsyncStorage - same approach as the Medusa cart id in cartSync.ts, since
// "recent" implies it should survive a reload, unlike AppStateContext's own unpersisted state.
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed);
      })
      .catch(() => {
        // Corrupt/missing storage - start fresh, not worth surfacing.
      });
  }, []);

  // Most-recent-first, case-insensitive de-duped (re-searching something already in the list
  // just moves it to the front instead of adding a second entry), capped at MAX_RECENT.
  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecent([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { recentSearches: recent, addRecentSearch, clearRecentSearches };
}
