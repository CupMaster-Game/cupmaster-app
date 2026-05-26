import { Pencil, BadgeCheck, Trophy } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Flag } from '@/components/ui/Flag';
import type { User } from '@/types';

interface ProfileHeaderProps {
  user: User;
  onEdit: () => void;
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
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-bold">{user.name}</h2>
            {user.verified && (
              <BadgeCheck className="h-5 w-5 text-brand-400" />
            )}
          </div>
          <p className="text-sm text-text-muted">{user.handle}</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            <Flag code={user.countryCode} size="sm" />
            <span className="text-text-secondary">{countryName(user.countryCode)}</span>
          </div>
        </div>
      </div>
      <div className="relative grid grid-cols-2 gap-px overflow-hidden border-t border-border-subtle bg-border-subtle">
        <Stat
          icon={<span className="text-base">⭐</span>}
          label="Total Points"
          value={user.totalPoints.toLocaleString()}
          unit="PTS"
          accent="brand"
        />
        <Stat
          icon={<Trophy className="h-4 w-4 text-accent-gold" />}
          label="Global Ranking"
          value={`#${user.globalRank.toLocaleString()}`}
          unit="Top 2.1%"
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

function countryName(code: string): string {
  // Lightweight ISO → name lookup for a curated set; falls back to the code.
  const map: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    BR: 'Brazil',
    AR: 'Argentina',
    FR: 'France',
    DE: 'Germany',
    ES: 'Spain',
    IT: 'Italy',
    PT: 'Portugal',
    NL: 'Netherlands',
    JP: 'Japan',
    KR: 'South Korea',
    CA: 'Canada',
    MX: 'Mexico',
    AU: 'Australia',
    TR: 'Türkiye',
    BE: 'Belgium',
    HR: 'Croatia',
    DK: 'Denmark',
    SE: 'Sweden',
    NO: 'Norway',
    CH: 'Switzerland',
    PL: 'Poland',
    AT: 'Austria',
    UY: 'Uruguay',
    CO: 'Colombia',
    CL: 'Chile',
    EC: 'Ecuador',
    PE: 'Peru',
    PY: 'Paraguay',
    MA: 'Morocco',
    EG: 'Egypt',
    NG: 'Nigeria',
    ZA: 'South Africa',
    GH: 'Ghana',
    SN: 'Senegal',
    CI: 'Ivory Coast',
    CM: 'Cameroon',
    TN: 'Tunisia',
    DZ: 'Algeria',
    IR: 'Iran',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    CR: 'Costa Rica',
    JM: 'Jamaica',
    PA: 'Panama',
    NZ: 'New Zealand',
  };
  return map[code] ?? code;
}
