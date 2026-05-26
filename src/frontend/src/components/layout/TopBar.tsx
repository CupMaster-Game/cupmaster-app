import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';

export function TopBar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="safe-top sticky top-0 z-30 bg-bg-base/80 px-4 pb-3 pt-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <Link to="/fixture" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="chip text-sm">
            <span className="text-base">⭐</span>
            <span className="font-semibold text-text-primary">
              {user.stats.total_score.toLocaleString()}
            </span>
          </div>
          <Link
            to="/profile"
            className="relative inline-block"
            aria-label="Profile"
          >
            <Avatar name={user.name} size="md" ring="brand" />
            <span className="absolute -bottom-1 -right-1 inline-block overflow-hidden rounded-full ring-2 ring-bg-base">
              <img
                src={'/assets/team-logos/' + user.flag}
                alt=""
                className="h-4 w-4 object-cover"
              />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
