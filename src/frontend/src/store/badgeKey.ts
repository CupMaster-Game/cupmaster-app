import type { BadgeCategory, BadgeTier } from '@/types';

export function badgeKey(category: BadgeCategory, tier: BadgeTier): string {
  return `${category}:${tier}`;
}
