import { useEffect, useState } from 'react';

// The terms that cycle after "Search for " in every search field's placeholder. Real product names
// rather than generic category words: an empty search box is the one place the app can teach a new
// customer what it actually stocks, and "dashamoolarishta" does that in a way "Search products or
// brands" never could.
export const SEARCH_SUGGESTIONS = [
  'dasamoola kashaya',
  'amritharishta',
  'dashamoolarishta',
  'triphala guggulu',
  'trikatu churna',
] as const;

const ROTATE_MS = 2200;

/**
 * The current "Search for <term>" placeholder, advancing through SEARCH_SUGGESTIONS on a timer.
 *
 * Rotation stops while `paused` is true - callers pass their own "field has text" flag, because a
 * placeholder that keeps animating under a typed query is invisible work: it's covered by the text,
 * and the interval keeps re-rendering the screen for nothing.
 */
export function useSearchPlaceholder(paused = false): string {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % SEARCH_SUGGESTIONS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return `Search for ${SEARCH_SUGGESTIONS[i]}`;
}
