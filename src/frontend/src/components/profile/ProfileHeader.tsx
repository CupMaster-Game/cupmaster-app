import { Pencil, Trophy } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { AuthedUser } from '@/hooks/useAuth';

interface ProfileHeaderProps {
  user: AuthedUser;
  onEdit: () => void;
}

function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export function ProfileHeader({ user, onEdit }: ProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-stadium-gradient">
      <div className="absolute inset-0 bg-bg-surface/40" />
      <div className="relative flex items-center gap-4 p-5">
        <button
          type="button"
          onClick={onEdit}
          className="group relative"
          aria-label="Edit profile"
        >
          <Avatar name={user.name} size="2xl" ring="brand" />
          <span className="absolute bottom-0 right-0 rounded-full border-2 border-bg-base bg-brand-500 p-1.5 group-hover:bg-brand-400">
            <Pencil className="h-3 w-3 text-bg-base" />
          </span>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="font-mono text-xs text-text-muted">
            {shortenAddress(user.address)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            <img
              src={'/assets/team-logos/' + user.flag}
              alt=""
              className="h-4 w-6 rounded-sm object-cover"
            />
            <span className="text-text-secondary">My team</span>
          </div>
        </div>
      </div>
      <div className="relative grid grid-cols-2 gap-px overflow-hidden border-t border-border-subtle bg-border-subtle">
        <Stat
          icon={<span className="text-base">⭐</span>}
          label="Total Points"
          value={user.stats.total_score.toLocaleString()}
          unit="PTS"
          accent="brand"
        />
        <Stat
          icon={<Trophy className="h-4 w-4 text-accent-gold" />}
          label="Global Ranking"
          value={
            user.stats.global_rank === null
              ? 'Unranked'
              : `#${user.stats.global_rank.toLocaleString()}`
          }
          unit={user.stats.global_rank === null ? '—' : 'Worldwide'}
          accent="gold"
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent: 'brand' | 'gold';
}) {
  return (
    <div className="flex flex-col gap-1 bg-bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-xl font-extrabold ${
            accent === 'brand' ? 'text-brand-400' : 'text-text-primary'
          }`}
        >
          {value}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          {unit}
        </span>
      </div>
    </div>
  );
}
