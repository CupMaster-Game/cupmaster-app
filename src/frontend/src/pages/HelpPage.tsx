import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, BarChart3, CalendarDays, Gamepad2, LifeBuoy, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUPPORT_URL = 'https://t.me/cupmaster_support_bot';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: CalendarDays,
    title: 'Fixture & Predictions',
    description:
      'Browse the FIFA World Cup 2026 schedule and submit predictions for upcoming matches. Lock in your prediction before kickoff to earn points.',
  },
  {
    icon: BarChart3,
    title: 'Standings',
    description:
      'Follow group-stage standings and knockout brackets as results come in throughout the tournament.',
  },
  {
    icon: Gamepad2,
    title: 'Mini Games',
    description: 'Play Football Trivia, Guess the Player, and Match the Flag to earn extra points.',
  },
  {
    icon: Trophy,
    title: 'Leaderboard & Rewards',
    description:
      'Climb the global leaderboard with predictions and game scores. Top players win rewards at the end of the tournament.',
  },
];

export function HelpPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg-base">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-border-subtle bg-bg-base/90 px-4 py-3 backdrop-blur-md">
        <Link
          to="/fixture"
          aria-label="Back"
          className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-base font-semibold">Help</span>
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact support on Telegram"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-2.5 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-500/25"
        >
          <LifeBuoy className="h-4 w-4" />
          Support
        </a>
      </header>

      <main className="flex-1 px-4 pb-8 pt-4">
        <div className="card p-5">
          <div className="label text-brand-400">CupMaster</div>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight">How CupMaster works</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            CupMaster is a game about the FIFA World Cup and general football. Predict match
            results, play mini games, and climb the leaderboard to earn rewards.
          </p>

          <section className="mt-6 space-y-3">
            <h2 className="border-b border-accent-yellow/30 pb-2 text-sm font-bold uppercase tracking-wide text-text-primary">
              What you can do
            </h2>
            <ul className="space-y-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-xl border border-border-subtle bg-bg-elevated/40 p-3"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{title}</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="border-b border-accent-yellow/30 pb-2 text-sm font-bold uppercase tracking-wide text-text-primary">
              Getting started
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
              <li>Connect your wallet and complete a one-time sign-in.</li>
              <li>
                Open <span className="font-semibold text-text-primary">Fixture</span> and submit
                predictions for upcoming matches.
              </li>
              <li>
                Visit <span className="font-semibold text-text-primary">Games</span> to earn extra
                points from mini games.
              </li>
              <li>
                Track your rank on the{' '}
                <span className="font-semibold text-text-primary">Leaderboard</span> as the
                tournament unfolds.
              </li>
            </ol>
          </section>

          <section className="mt-6">
            <h2 className="border-b border-accent-yellow/30 pb-2 text-sm font-bold uppercase tracking-wide text-text-primary">
              Need help?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Have a question or run into an issue? Reach the CupMaster team directly on Telegram.
            </p>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-bg-base hover:bg-brand-400"
            >
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
