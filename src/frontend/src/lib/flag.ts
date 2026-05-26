// Convert a 2-letter ISO country code into its emoji flag.
// Used as a lightweight, dependency-free alternative to flag images.
export function countryCodeToFlag(code: string): string {
  if (code.length !== 2) return '🏳️';
  const upper = code.toUpperCase();
  const base = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  const chars = Array.from(upper, (c) =>
    String.fromCodePoint(base + (c.charCodeAt(0) - a)),
  );
  return chars.join('');
}
