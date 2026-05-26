import { useState } from 'react';
import { ClipboardList, Table2, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GroupTable } from '@/components/standings/GroupTable';
import {
  GroupPredictionWizard,
  GroupSummary,
} from '@/components/standings/GroupPredictionWizard';
import { KnockoutBracket } from '@/components/standings/KnockoutBracket';
import { KnockoutPredictionWizard } from '@/components/standings/KnockoutPredictionWizard';
import { GROUP_STANDINGS } from '@/data/standings';
import { GROUP_IDS } from '@/data/teams';

type StandingsTab = 'groups' | 'knockout';

export function StandingsPage() {
  const [tab, setTab] = useState<StandingsTab>('groups');
  const [groupWizardOpen, setGroupWizardOpen] = useState(false);
  const [knockoutWizardOpen, setKnockoutWizardOpen] = useState(false);

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
            onCta={() => { setGroupWizardOpen(true); }}
          />
          <div className="space-y-4">
            {GROUP_IDS.map((g) => (
              <div key={g} className="space-y-2">
                <GroupTable group={g} rows={GROUP_STANDINGS[g]} />
                <GroupSummary group={g} />
              </div>
            ))}
          </div>
          <GroupPredictionWizard
            open={groupWizardOpen}
            onClose={() => { setGroupWizardOpen(false); }}
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
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
        <Button onClick={onCta} size="sm">
          {ctaLabel}
        </Button>
      </div>
    </Card>
  );
}
