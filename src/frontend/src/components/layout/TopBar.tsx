import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Flag } from '@/components/ui/Flag';
import { useAppStore } from '@/store/AppStore';

export function TopBar() {
  const { user } = useAppStore();
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg-base/80 px-4 pb-3 pt-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <Link to="/fixture" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="chip text-sm">
            <span className="text-base">🪙</span>
            <span className="font-semibold text-text-primary">
              {user.totalPoints.toLocaleString()}
            </span>
          </div>
          <Link
            to="/profile"
            className="relative inline-block"
            aria-label="Profile"
          >
            <Avatar name={user.name} size="md" ring="brand" />
            <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-bg-base">
              <Flag code={user.countryCode} size="sm" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
