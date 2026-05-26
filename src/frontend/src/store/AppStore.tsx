import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  BadgeCategory,
  BadgeTier,
  GroupId,
  KnockoutPrediction,
  MatchOutcome,
  MatchPrediction,
  User,
} from '@/types';
import { CURRENT_USER } from '@/data/user';

interface PersistedState {
  user: User;
  predictions: Record<string, MatchPrediction>;
  groupPredictions: Partial<Record<GroupId, [string, string, string, string]>>;
  knockoutPredictions: Record<string, KnockoutPrediction>;
  claimedBadges: Record<string, true>;
  claimedRewards: Record<string, true>;
}

interface AppStore extends PersistedState {
  updateUser: (patch: Partial<Pick<User, 'name' | 'countryCode'>>) => void;
  setMatchPrediction: (matchId: string, pick: MatchOutcome) => void;
  setGroupOrder: (
    group: GroupId,
    order: [string, string, string, string],
  ) => void;
  setKnockoutWinner: (matchId: string, winnerTeamId: string) => void;
  claimBadge: (category: BadgeCategory, tier: BadgeTier) => void;
  claimReward: (rewardId: string) => void;
}

const STORAGE_KEY = 'cupmaster:v1';

function loadInitial(): PersistedState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      user: parsed.user ?? CURRENT_USER,
      predictions: parsed.predictions ?? {},
      groupPredictions: parsed.groupPredictions ?? {},
      knockoutPredictions: parsed.knockoutPredictions ?? {},
      claimedBadges: parsed.claimedBadges ?? {},
      claimedRewards: parsed.claimedRewards ?? {},
    };
  } catch {
    return defaultState();
  }
}

function defaultState(): PersistedState {
  return {
    user: CURRENT_USER,
    predictions: {},
    groupPredictions: {},
    knockoutPredictions: {},
    claimedBadges: {},
    claimedRewards: {},
  };
}

export function badgeKey(category: BadgeCategory, tier: BadgeTier): string {
  return `${category}:${tier}`;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [state]);

  const updateUser = useCallback<AppStore['updateUser']>((patch) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...patch } }));
  }, []);

  const setMatchPrediction = useCallback<AppStore['setMatchPrediction']>(
    (matchId, pick) => {
      setState((prev) => ({
        ...prev,
        predictions: {
          ...prev.predictions,
          [matchId]: {
            matchId,
            pick,
            predictedAt: new Date().toISOString(),
          },
        },
      }));
    },
    [],
  );

  const setGroupOrder = useCallback<AppStore['setGroupOrder']>((group, order) => {
    setState((prev) => ({
      ...prev,
      groupPredictions: { ...prev.groupPredictions, [group]: order },
    }));
  }, []);

  const setKnockoutWinner = useCallback<AppStore['setKnockoutWinner']>(
    (matchId, winnerTeamId) => {
      setState((prev) => ({
        ...prev,
        knockoutPredictions: {
          ...prev.knockoutPredictions,
          [matchId]: { matchId, winnerTeamId },
        },
      }));
    },
    [],
  );

  const claimBadge = useCallback<AppStore['claimBadge']>((category, tier) => {
    setState((prev) => ({
      ...prev,
      claimedBadges: {
        ...prev.claimedBadges,
        [badgeKey(category, tier)]: true,
      },
    }));
  }, []);

  const claimReward = useCallback<AppStore['claimReward']>((rewardId) => {
    setState((prev) => ({
      ...prev,
      claimedRewards: { ...prev.claimedRewards, [rewardId]: true },
    }));
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      ...state,
      updateUser,
      setMatchPrediction,
      setGroupOrder,
      setKnockoutWinner,
      claimBadge,
      claimReward,
    }),
    [
      state,
      updateUser,
      setMatchPrediction,
      setGroupOrder,
      setKnockoutWinner,
      claimBadge,
      claimReward,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}
