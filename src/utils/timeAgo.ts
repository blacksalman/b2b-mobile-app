// Relative-time formatting for real review dates (reviewsApi.ts) - matches the exact phrasing
// the mock review data already used ("2 weeks ago", "1 month ago"), so wiring in real
// `created_at` timestamps needs no visual change to the Reviews screens.
const DIVISIONS: { amount: number; name: string }[] = [
  { amount: 60, name: 'second' },
  { amount: 60, name: 'minute' },
  { amount: 24, name: 'hour' },
  { amount: 7, name: 'day' },
  { amount: 4.345, name: 'week' },
  { amount: 12, name: 'month' },
  { amount: Infinity, name: 'year' },
];

export function timeAgo(iso: string): string {
  let value = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  for (const division of DIVISIONS) {
    if (value < division.amount) {
      const rounded = Math.floor(value);
      if (division.name === 'second') return rounded < 5 ? 'just now' : `${rounded} seconds ago`;
      return `${rounded} ${division.name}${rounded === 1 ? '' : 's'} ago`;
    }
    value /= division.amount;
  }
  const years = Math.floor(value);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
