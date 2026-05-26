// Deterministic name-based avatar utilities.
// Picks a color from the palette via a hash of the name, then returns the
// background color + the user's initials.

const PALETTE: readonly string[] = [
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#ef4444',
  '#facc15',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (!first) return '?';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

export function getAvatarColor(name: string): string {
  const color = PALETTE[hash(name) % PALETTE.length];
  return color ?? '#22c55e';
}
