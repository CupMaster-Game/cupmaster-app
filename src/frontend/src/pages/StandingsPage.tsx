import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Table2, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GroupTable, type GroupTableTeam } from '@/components/standings/GroupTable';
import {
  GroupPredictionWizard,
  GroupSummary,
} from '@/components/standings/GroupPredictionWizard';
import { KnockoutBracket } from '@/components/standings/KnockoutBracket';
import { KnockoutPredictionWizard } from '@/components/standings/KnockoutPredictionWizard';
import { api } from '@/lib/api';

interface ApiTeam {
  team_id: string;
  api_team_id: number;
  team_name: string;
  country_code: string;
  logo: string;
  group_name: string;
}

type StandingsTab = 'groups' | 'knockout';

function groupKeyFromName(groupName: string): string {
  // "Group A" -> "A"
  return groupName.replace(/^Group\s+/i, '').trim();
}

export function StandingsPage() {
  const [tab, setTab] = useState<StandingsTab>('groups');
  const [groupWizardOpen, setGroupWizardOpen] = useState(false);
  const [knockoutWizardOpen, setKnockoutWizardOpen] = useState(false);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.teams
      .$get()
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status.toString()}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setTeams(data.teams);
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

  const groups = useMemo(() => {
    const byGroup = new Map<string, GroupTableTeam[]>();
    for (const t of teams) {
      const key = groupKeyFromName(t.group_name);
      const list = byGroup.get(key) ?? [];
      list.push({
        team_id: t.team_id,
        team_name: t.team_name,
        country_code: t.country_code,
        logo: t.logo,
      });
      byGroup.set(key, list);
    }
    return Array.from(byGroup.entries())
      .map(([groupName, list]) => ({
        groupName,
        teams: [...list].sort((a, b) =>
          a.team_name.localeCompare(b.team_name),
        ),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [teams]);

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

      {tab === 'groups' && (
        <>
          <PredictionPrompt
            icon={<ClipboardList className="h-6 w-6 text-accent-purple" />}
            title="Create Your Custom Standings"
            description="Predict how each group will finish and compete with others!"
            ctaLabel="Create Now"
            disabled={loading || !!error || groups.length === 0}
            onCta={() => { setGroupWizardOpen(true); }}
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
                  <GroupSummary group={groupName} teams={groupTeams} />
                </div>
              ))}
            </div>
          )}
          <GroupPredictionWizard
            open={groupWizardOpen}
            onClose={() => { setGroupWizardOpen(false); }}
            groups={groups}
          />
        </>
      )}

      {tab === 'knockout' && (
        <>
          <PredictionPrompt
            icon={<Trophy className="h-6 w-6 text-accent-orange" />}
            title="Predict the Knockout"
            description="Pick winners round-by-round, all the way to the trophy."
            ctaLabel="Start Bracket"
            disabled
            onCta={() => { setKnockoutWizardOpen(true); }}
          />
          <KnockoutBracket />
          <KnockoutPredictionWizard
            open={knockoutWizardOpen}
            onClose={() => { setKnockoutWizardOpen(false); }}
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
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
        <Button onClick={onCta} size="sm" disabled={disabled} className="shrink-0 whitespace-nowrap">
          {ctaLabel}
        </Button>
      </div>
    </Card>
  );
}
