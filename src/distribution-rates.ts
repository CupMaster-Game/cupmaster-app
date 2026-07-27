const percentageByRank: Record<number, number> = {
  1: 15.0,
  2: 12.79,
  3: 10.91,
  4: 9.3,
  5: 7.93,
  6: 6.77,
  7: 5.77,
  8: 4.92,
  9: 4.2,
  10: 3.58,
  11: 3.05,
  12: 2.6,
  13: 2.22,
  14: 1.89,
  15: 1.62,
  16: 1.38,
  17: 1.18,
  18: 1.0,
  19: 0.86,
  20: 0.73,
  21: 0.62,
  22: 0.53,
  23: 0.45,
  24: 0.39,
  25: 0.33,
};

export function getPercentageByRank(rank: number): number {
  if (rank < 1) {
    throw new Error('Rank must be at least 1');
  }
  if (rank > 25) {
    return 0;
  }
  return percentageByRank[rank] ?? 0;
}
