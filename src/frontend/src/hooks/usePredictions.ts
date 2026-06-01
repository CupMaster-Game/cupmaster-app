import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getAuthedApi } from '@/lib/api';

export type MatchOutcome = 'team1' | 'team2' | 'draw';

export interface MatchPredictionEntry {
  match_number: number;
  result: MatchOutcome;
  predicted_at: string;
}

export interface GroupStandingEntry {
  group_name: string;
  ordered_teams: string[];
}

export interface GroupPredictionEntry {
  standings: GroupStandingEntry[];
  predicted_at: string;
}

export interface KnockoutMatchResultEntry {
  match_number: number;
  winner_team_id: string;
}

export interface KnockoutPredictionEntry {
  match_results: KnockoutMatchResultEntry[];
  predicted_at: string;
}

export interface PredictionsState {
  match_predictions: MatchPredictionEntry[];
  group_prediction: GroupPredictionEntry | null;
  knockout_prediction: KnockoutPredictionEntry | null;
}

interface MatchPredictionPayload {
  type: 'match_prediction';
  data: { match_number: number; result: MatchOutcome };
}
interface GroupPredictionPayload {
  type: 'group_prediction';
  data: { standings: GroupStandingEntry[] };
}
interface KnockoutPredictionPayload {
  type: 'knockout_bracket_prediction';
  data: { match_results: KnockoutMatchResultEntry[] };
}

const EMPTY_PREDICTIONS: PredictionsState = {
  match_predictions: [],
  group_prediction: null,
  knockout_prediction: null,
};

export type SubmitResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function usePredictions() {
  const { address } = useAccount();
  const [predictions, setPredictions] = useState<PredictionsState>(EMPTY_PREDICTIONS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const authed = getAuthedApi(address);
    if (!authed) {
      setPredictions(EMPTY_PREDICTIONS);
      setLoading(false);
      return;
    }
    try {
      const res = await authed.predictions.$get();
      if (!res.ok) {
        setPredictions(EMPTY_PREDICTIONS);
        return;
      }
      const data: PredictionsState = await res.json();
      setPredictions(data);
    } catch {
      setPredictions(EMPTY_PREDICTIONS);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    // Fetch-then-setState pattern (analogous to useAuth's auth check). The
    // setState happens inside the awaited refresh, not synchronously here.
    /* eslint-disable react-hooks/set-state-in-effect */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh]);

  const submitPrediction = useCallback(
    async (
      payload:
        | MatchPredictionPayload
        | GroupPredictionPayload
        | KnockoutPredictionPayload,
      mode: 'submit' | 'submitChange'
    ): Promise<SubmitResult> => {
      const authed = getAuthedApi(address);
      if (!authed) {
        return { ok: false, status: 401, error: 'not authenticated' };
      }
      const endpoint =
        mode === 'submit' ? authed.predictions.submit : authed.predictions.submitChange;
      const res = await endpoint.$post({ json: payload });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status.toString()}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) errMsg = body.error;
        } catch {
          // ignore parse error
        }
        return { ok: false, status: res.status, error: errMsg };
      }
      await refresh();
      return { ok: true };
    },
    [address, refresh]
  );

  return { predictions, loading, refresh, submitPrediction };
}
