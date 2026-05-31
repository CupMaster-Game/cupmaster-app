import { createContext, useContext } from 'react';
import type {
  GroupId,
  KnockoutPrediction,
  MatchOutcome,
  MatchPrediction,
  BadgeCategory,
  BadgeTier,
} from '@/types';

export interface PersistedState {
  predictions: Record<string, MatchPrediction>;
  groupPredictions: Partial<Record<GroupId, [string, string, string, string]>>;
  knockoutPredictions: Record<string, KnockoutPrediction>;
  claimedBadges: Record<string, true>;
  claimedRewards: Record<string, true>;
}

export interface AppStore extends PersistedState {
  setMatchPrediction: (matchId: string, pick: MatchOutcome) => void;
  setGroupOrder: (
    group: GroupId,
    order: [string, string, string, string],
  ) => void;
  setKnockoutWinner: (matchId: string, winnerTeamId: string) => void;
  claimBadge: (category: BadgeCategory, tier: BadgeTier) => void;
  claimReward: (rewardId: string) => void;
}

export const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}
