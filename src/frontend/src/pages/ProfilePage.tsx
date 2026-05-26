import { BadgeRow } from '@/components/profile/BadgeRow';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { RewardsList } from '@/components/profile/RewardsList';
import { Card } from '@/components/ui/Card';
import { BADGE_LADDERS } from '@/data/user';
import { useAuth } from '@/hooks/useAuth';
import type { BadgeCategory, BadgeProgress } from '@/types';
import { Gamepad2, Target, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';

export function ProfilePage() {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const badges = useMemo<BadgeProgress[]>(() => {
    if (!user) return [];
    const currentByCategory: Record<BadgeCategory, number> = {
      predictions_made: user.stats.predictions_made,
      // No backend counter yet for these; show 0 until tracked.
      correct_predictions: 0,
      games_played: user.stats.games_played,
      daily_streak: 0,
      points_earned: user.stats.total_score,
    };
    return BADGE_LADDERS.map((ladder) => ({
      ...ladder,
      current: currentByCategory[ladder.category],
    }));
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-4 pb-4">
      <ProfileHeader
        user={user}
        onEdit={() => {
          setEditOpen(true);
        }}
      />

      <Card>
        <div className="grid grid-cols-2 divide-x divide-border-subtle">
          <MiniStat
            icon={<Gamepad2 className="h-5 w-5 text-brand-400" />}
            label="Games Played"
            value={user.stats.games_played.toLocaleString()}
            sub="All Time"
          />
          <MiniStat
            icon={<Target className="h-5 w-5 text-brand-400" />}
            label="Predictions Made"
            value={user.stats.predictions_made.toLocaleString()}
            sub="All Time"
          />
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Rewards</h2>
            <p className="text-xs text-text-muted">Claim points and prizes you've earned.</p>
          </div>
        </div>
        <RewardsList />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold">Badges</h2>
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <Trophy className="h-3.5 w-3.5 text-accent-gold" />
              Complete badges and level up to gold!
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {badges.map((b) => (
            <BadgeRow key={b.category} badge={b} />
          ))}
        </div>
      </section>

      <EditProfileModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
        }}
        initialName={user.name}
        initialFlag={user.flag}
      />
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10">
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-xl font-extrabold">{value}</p>
        <p className="text-[10px] text-text-faint">{sub}</p>
      </div>
    </div>
  );
}
