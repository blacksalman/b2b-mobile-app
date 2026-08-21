// Ported verbatim from the source prototype: `const money = n => '₹' + n.toFixed(2);`
export function money(n: number): string {
  return '₹' + n.toFixed(2);
}
