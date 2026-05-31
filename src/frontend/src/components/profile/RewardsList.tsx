import { Gift } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { REWARDS } from '@/data/user';
import { useAppStore } from '@/store/useAppStore';

export function RewardsList() {
  const { claimedRewards, claimReward } = useAppStore();
  const unclaimed = REWARDS.filter((r) => !claimedRewards[r.id]);
  if (unclaimed.length === 0) {
    return (
      <Card className="px-4 py-6 text-center text-sm text-text-muted">
        No rewards to claim right now. Keep playing!
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {unclaimed.map((r) => (
        <Card key={r.id} className="overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-gold/15">
              <Gift className="h-6 w-6 text-accent-gold" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">{r.title}</h3>
              <p className="text-xs text-text-muted">{r.description}</p>
            </div>
            <Button
              size="sm"
              onClick={() => { claimReward(r.id); }}
            >
              Claim {r.amount} {r.unit}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
