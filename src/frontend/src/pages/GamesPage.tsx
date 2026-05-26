import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GameCard } from '@/components/games/GameCard';
import { TriviaGame } from '@/components/games/TriviaGame';
import { GuessThePlayerGame } from '@/components/games/GuessThePlayerGame';
import { MatchTheFlagGame } from '@/components/games/MatchTheFlagGame';
import { GAMES } from '@/data/games';
import type { GameKind } from '@/types';

export function GamesPage() {
  const [active, setActive] = useState<GameKind | null>(null);

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Games" subtitle="Play mini games and earn points!" />
      <div className="space-y-3">
        {GAMES.map((g) => (
          <GameCard
            key={g.kind}
            game={g}
            onPlay={() => { setActive(g.kind); }}
          />
        ))}
      </div>

      <TriviaGame open={active === 'trivia'} onClose={() => { setActive(null); }} />
      <GuessThePlayerGame
        open={active === 'guess_player'}
        onClose={() => { setActive(null); }}
      />
      <MatchTheFlagGame
        open={active === 'match_flag'}
        onClose={() => { setActive(null); }}
      />
    </div>
  );
}
