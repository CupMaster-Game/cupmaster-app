import { useState } from 'react';
import { Bell, Settings, Trophy, Target, Gamepad2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BadgeRow } from '@/components/profile/BadgeRow';
import { RewardsList } from '@/components/profile/RewardsList';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { BADGES } from '@/data/user';
import { useAppStore } from '@/store/AppStore';

export function ProfilePage() {
  const { user, updateUser } = useAppStore();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="relative rounded-xl border border-border-subtle bg-bg-surface p-2.5 text-text-secondary hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-bg-base" />
        </button>
        <button
          type="button"
          className="rounded-xl border border-border-subtle bg-bg-surface p-2.5 text-text-secondary hover:text-text-primary"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <ProfileHeader user={user} onEdit={() => { setEditOpen(true); }} />

      <Card>
        <div className="grid grid-cols-2 divide-x divide-border-subtle">
          <MiniStat
            icon={<Gamepad2 className="h-5 w-5 text-brand-400" />}
            label="Games Played"
            value={user.gamesPlayed.toString()}
            sub="All Time"
          />
          <MiniStat
            icon={<Target className="h-5 w-5 text-brand-400" />}
            label="Predictions Made"
            value={user.predictionsMade.toString()}
            sub="All Time"
          />
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Rewards</h2>
            <p className="text-xs text-text-muted">
              Claim points and prizes you've earned.
            </p>
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
          {BADGES.map((b) => (
            <BadgeRow key={b.category} badge={b} />
          ))}
        </div>
      </section>

      <EditProfileModal
        open={editOpen}
        onClose={() => { setEditOpen(false); }}
        initialName={user.name}
        initialCountryCode={user.countryCode}
        onSave={(patch) => { updateUser(patch); }}
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
