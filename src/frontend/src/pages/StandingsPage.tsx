import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Table2, Trophy } from 'lucide-react';
import { useAccount } from 'wagmi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GroupTable, type GroupTableTeam } from '@/components/standings/GroupTable';
import {
  GroupPredictionWizard,
  GroupSummary,
  type GroupPicks,
} from '@/components/standings/GroupPredictionWizard';
import { KnockoutBracket } from '@/components/standings/KnockoutBracket';
import {
  KnockoutPredictionWizard,
  type KnockoutPicks,
} from '@/components/standings/KnockoutPredictionWizard';
import { api, getAuthedApi } from '@/lib/api';
import { usePlayGame } from '@/hooks/usePlayGame';
import { usePredictions } from '@/hooks/usePredictions';

interface ApiTeam {
  team_id: string;
  api_team_id: number;
  team_name: string;
  country_code: string;
  logo: string;
  group_name: string;
}

interface ApiStanding {
  team_id: string;
  group_name: string;
  rank: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals_for: number;
  goals_against: number;
  goals_diff: number;
  points: number;
}

type StandingsTab = 'groups' | 'knockout';

function groupKeyFromName(groupName: string): string {
  return groupName.replace(/^Group\s+/i, '').trim();
}

// Knockout bracket local IDs (k32-1..k32-16, k16-1..k16-8, kqf-1..kqf-4,
// ksf-1..ksf-2, kfinal) → match_schedules.match_number. Mirrors FIFA's 2026
// numbering (matches 73-104 cover the knockout stage, with 103 reserved for
// the 3rd-place playoff which the bracket does not include).
const KNOCKOUT_ID_TO_MATCH_NUMBER: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < 16; i++) m[`k32-${(i + 1).toString()}`] = 73 + i;
  for (let i = 0; i < 8; i++) m[`k16-${(i + 1).toString()}`] = 89 + i;
  for (let i = 0; i < 4; i++) m[`kqf-${(i + 1).toString()}`] = 97 + i;
  for (let i = 0; i < 2; i++) m[`ksf-${(i + 1).toString()}`] = 101 + i;
  m.kfinal = 104;
  return m;
})();

const MATCH_NUMBER_TO_KNOCKOUT_ID: Record<number, string> = Object.fromEntries(
  Object.entries(KNOCKOUT_ID_TO_MATCH_NUMBER).map(([k, v]) => [v, k])
);

const GAME_TYPE_GROUP = 202 as const;
const GAME_TYPE_KNOCKOUT = 203 as const;

export function StandingsPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState<StandingsTab>('groups');
  const [groupWizardOpen, setGroupWizardOpen] = useState(false);
  const [knockoutWizardOpen, setKnockoutWizardOpen] = useState(false);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [standings, setStandings] = useState<ApiStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groupRequiresPayment, setGroupRequiresPayment] = useState(false);
  const [knockoutRequiresPayment, setKnockoutRequiresPayment] = useState(false);

  const { predictions, submitPrediction } = usePredictions();
  const { buyEnergy, buyError, resetBuyError } = usePlayGame();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.teams.$get().then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status.toString()}`);
        return res.json();
      }),
      // Standings are best-effort: an empty/failed result just leaves the
      // tables at zero rather than blocking the page.
      api.standings
        .$get()
        .then(async (res) => (res.ok ? res.json() : { standings: [] }))
        .catch(() => ({ standings: [] as ApiStanding[] })),
    ])
      .then(([teamsData, standingsData]) => {
        if (cancelled) return;
        setTeams(teamsData.teams);
        setStandings(standingsData.standings);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[StandingsPage] failed to load teams', err);
        setError('Could not load teams. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const standingByTeamId = useMemo(() => {
    const m = new Map<string, ApiStanding>();
    for (const s of standings) m.set(s.team_id, s);
    return m;
  }, [standings]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, { team: GroupTableTeam; standing: ApiStanding | undefined }[]>();
    for (const t of teams) {
      const key = groupKeyFromName(t.group_name);
      const s = standingByTeamId.get(t.team_id);
      const list = byGroup.get(key) ?? [];
      list.push({
        team: {
          team_id: t.team_id,
          team_name: t.team_name,
          country_code: t.country_code,
          logo: t.logo,
          standing: s
            ? {
                played: s.played,
                win: s.win,
                draw: s.draw,
                lose: s.lose,
                goals_diff: s.goals_diff,
                points: s.points,
              }
            : undefined,
        },
        standing: s,
      });
      byGroup.set(key, list);
    }
    return Array.from(byGroup.entries())
      .map(([groupName, list]) => ({
        groupName,
        // Order by the football API rank. When ranks tie (or a team has no
        // standing row yet) break the tie by points, then goal difference,
        // then goals scored, and only fall back to alphabetical as a last
        // resort. Teams with a standing always sort ahead of teams without.
        teams: [...list]
          .sort((a, b) => {
            const sa = a.standing;
            const sb = b.standing;
            if (sa && !sb) return -1;
            if (!sa && sb) return 1;
            if (sa && sb) {
              if (sa.rank !== sb.rank) return sa.rank - sb.rank;
              if (sb.points !== sa.points) return sb.points - sa.points;
              if (sb.goals_diff !== sa.goals_diff) return sb.goals_diff - sa.goals_diff;
              if (sb.goals_for !== sa.goals_for) return sb.goals_for - sa.goals_for;
            }
            return a.team.team_name.localeCompare(b.team.team_name);
          })
          .map((e) => e.team),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [teams, standingByTeamId]);

  const groupInitialPicks = useMemo<GroupPicks>(() => {
    if (!predictions.group_prediction) return {};
    const out: GroupPicks = {};
    for (const s of predictions.group_prediction.standings) {
      out[s.group_name] = s.ordered_teams;
    }
    return out;
  }, [predictions.group_prediction]);

  const knockoutInitialPicks = useMemo<KnockoutPicks>(() => {
    if (!predictions.knockout_prediction) return {};
    const out: KnockoutPicks = {};
    for (const r of predictions.knockout_prediction.match_results) {
      const localId = MATCH_NUMBER_TO_KNOCKOUT_ID[r.match_number];
      if (localId) out[localId] = r.winner_team_id;
    }
    return out;
  }, [predictions.knockout_prediction]);

  const hasGroupPrediction = predictions.group_prediction !== null;
  const hasKnockoutPrediction = predictions.knockout_prediction !== null;

  // When a wizard opens for a brand-new prediction, check whether the user has
  // energy. If not, the Finish button shows the 0.05$ cost so the user knows
  // the buy transaction will be triggered on submit.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!groupWizardOpen || hasGroupPrediction) {
      setGroupRequiresPayment(false);
      return;
    }
    const authed = getAuthedApi(address);
    if (!authed) return;
    let cancelled = false;
    void authed.user.numbers.$get().then(async (res) => {
      if (!res.ok) return;
      const body = (await res.json()) as { energies: Record<string, number> };
      const energy = body.energies[String(GAME_TYPE_GROUP)] ?? 0;
      if (cancelled) return;
      setGroupRequiresPayment(energy <= 0);
    });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [groupWizardOpen, hasGroupPrediction, address]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!knockoutWizardOpen || hasKnockoutPrediction) {
      setKnockoutRequiresPayment(false);
      return;
    }
    const authed = getAuthedApi(address);
    if (!authed) return;
    let cancelled = false;
    void authed.user.numbers.$get().then(async (res) => {
      if (!res.ok) return;
      const body = (await res.json()) as { energies: Record<string, number> };
      const energy = body.energies[String(GAME_TYPE_KNOCKOUT)] ?? 0;
      if (cancelled) return;
      setKnockoutRequiresPayment(energy <= 0);
    });
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [knockoutWizardOpen, hasKnockoutPrediction, address]);

  const handleGroupSubmit = useCallback(
    async (picks: GroupPicks): Promise<{ ok: boolean; error?: string }> => {
      // For new submissions (not edits), ensure energy first — buying it on
      // demand if the user has none. Editing an existing prediction does not
      // consume energy.
      if (!hasGroupPrediction) {
        const authed = getAuthedApi(address);
        if (!authed) {
          return { ok: false, error: 'Please connect your wallet first.' };
        }
        const energyRes = await authed.user.numbers.$get();
        let energy = 0;
        if (energyRes.ok) {
          const body = (await energyRes.json()) as { energies: Record<string, number> };
          energy = body.energies[String(GAME_TYPE_GROUP)] ?? 0;
        }
        if (energy <= 0) {
          const ok = await buyEnergy(GAME_TYPE_GROUP);
          if (!ok) {
            return { ok: false, error: 'Failed to buy energy. Please try again.' };
          }
        }
      }

      const standings = Object.entries(picks)
        .filter(([, ordered]) => ordered.length > 0)
        .map(([group_name, ordered]) => ({
          group_name,
          ordered_teams: [...ordered],
        }));
      const result = await submitPrediction(
        { type: 'group_prediction', data: { standings } },
        hasGroupPrediction ? 'submitChange' : 'submit'
      );
      return result.ok
        ? { ok: true }
        : { ok: false, error: result.error };
    },
    [submitPrediction, hasGroupPrediction, address, buyEnergy]
  );

  const handleKnockoutSubmit = useCallback(
    async (picks: KnockoutPicks): Promise<{ ok: boolean; error?: string }> => {
      if (!hasKnockoutPrediction) {
        const authed = getAuthedApi(address);
        if (!authed) {
          return { ok: false, error: 'Please connect your wallet first.' };
        }
        const energyRes = await authed.user.numbers.$get();
        let energy = 0;
        if (energyRes.ok) {
          const body = (await energyRes.json()) as { energies: Record<string, number> };
          energy = body.energies[String(GAME_TYPE_KNOCKOUT)] ?? 0;
        }
        if (energy <= 0) {
          const ok = await buyEnergy(GAME_TYPE_KNOCKOUT);
          if (!ok) {
            return { ok: false, error: 'Failed to buy energy. Please try again.' };
          }
        }
      }

      const match_results = Object.entries(picks)
        .map(([localId, winner_team_id]) => {
          const match_number = KNOCKOUT_ID_TO_MATCH_NUMBER[localId];
          if (match_number === undefined) return null;
          return { match_number, winner_team_id };
        })
        .filter((v): v is { match_number: number; winner_team_id: string } => v !== null);
      const result = await submitPrediction(
        { type: 'knockout_bracket_prediction', data: { match_results } },
        hasKnockoutPrediction ? 'submitChange' : 'submit'
      );
      return result.ok
        ? { ok: true }
        : { ok: false, error: result.error };
    },
    [submitPrediction, hasKnockoutPrediction, address, buyEnergy]
  );

  const buyErrorMsg =
    buyError === 'insufficient_balance'
      ? 'Not enough balance to buy energy. Please top up USDT/USDC/USDm.'
      : buyError === 'submit_failed'
        ? 'Purchase confirmed on-chain but failed to register. Try again in a moment.'
        : buyError === 'no_wallet'
          ? 'Please connect your wallet first.'
          : null;
  const displayError = actionError ?? buyErrorMsg;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Standings" subtitle="FIFA World Cup 2026™" />

      <Tabs<StandingsTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'groups', label: 'Group Standings', icon: <Table2 className="h-4 w-4" /> },
          { value: 'knockout', label: 'Knockout Bracket', icon: <Trophy className="h-4 w-4" /> },
        ]}
      />

      {displayError && (
        <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">
          {displayError}
        </div>
      )}

      {tab === 'groups' && (
        <>
          <PredictionPrompt
            icon={<ClipboardList className="h-6 w-6 text-accent-purple" />}
            title="Group Standings Predictions"
            description="Predict how each group will finish and compete with others!"
            ctaLabel={hasGroupPrediction ? 'Edit' : 'Create Now'}
            closedMessage="Standings predictions are closed."
            onCta={() => {
              setActionError(null);
              resetBuyError();
              setGroupWizardOpen(true);
            }}
          />
          {loading && (
            <Card className="px-4 py-6 text-center text-sm text-text-muted">
              Loading teams…
            </Card>
          )}
          {!loading && error && (
            <Card className="px-4 py-6 text-center text-sm text-accent-red">
              {error}
            </Card>
          )}
          {!loading && !error && (
            <div className="space-y-4">
              {groups.map(({ groupName, teams: groupTeams }) => (
                <div key={groupName} className="space-y-2">
                  <GroupTable group={groupName} teams={groupTeams} />
                  <GroupSummary
                    teams={groupTeams}
                    prediction={groupInitialPicks[groupName]}
                  />
                </div>
              ))}
            </div>
          )}
          <GroupPredictionWizard
            open={groupWizardOpen}
            onClose={() => { setGroupWizardOpen(false); }}
            groups={groups}
            initialPicks={groupInitialPicks}
            requiresPayment={groupRequiresPayment}
            onSubmit={handleGroupSubmit}
          />
        </>
      )}

      {tab === 'knockout' && (
        <>
          <PredictionPrompt
            icon={<Trophy className="h-6 w-6 text-accent-orange" />}
            title={hasKnockoutPrediction ? 'Update Your Bracket' : 'Predict the Knockout'}
            description="Pick winners round-by-round, all the way to the trophy."
            ctaLabel="Start Bracket"
            disabled
            onCta={() => {
              setActionError(null);
              resetBuyError();
              setKnockoutWizardOpen(true);
            }}
          />
          <KnockoutBracket picks={knockoutInitialPicks} />
          <KnockoutPredictionWizard
            open={knockoutWizardOpen}
            onClose={() => { setKnockoutWizardOpen(false); }}
            initialPicks={knockoutInitialPicks}
            requiresPayment={knockoutRequiresPayment}
            onSubmit={handleKnockoutSubmit}
          />
        </>
      )}
    </div>
  );
}

function PredictionPrompt({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  disabled,
  closedMessage,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
  // When set, predictions are closed: the CTA button is hidden and this
  // warning is shown in its place.
  closedMessage?: string;
}) {
  return (
    <Card className="bg-card-gradient">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg-elevated">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
        {!closedMessage && (
          <Button onClick={onCta} size="sm" disabled={disabled} className="shrink-0 whitespace-nowrap">
            {ctaLabel}
          </Button>
        )}
      </div>
      {closedMessage && (
        <div className="border-t border-accent-orange/30 bg-accent-orange/10 px-4 py-2.5 text-xs font-medium text-accent-orange">
          {closedMessage}
        </div>
      )}
    </Card>
  );
}
