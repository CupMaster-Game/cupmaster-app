import { GameCard } from '@/components/games/GameCard';
import { GuessThePlayerGame } from '@/components/games/GuessThePlayerGame';
import { MatchTheFlagGame } from '@/components/games/MatchTheFlagGame';
import { TriviaGame } from '@/components/games/TriviaGame';
import { PageHeader } from '@/components/ui/PageHeader';
import { GAMES } from '@/data/games';
import { usePlayGame } from '@/hooks/usePlayGame';
import { getAuthedApi } from '@/lib/api';
import type { GameKind, GameSummary } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

type GameType = GameSummary['gameType'];
type EnergyMap = Partial<Record<GameType, number>>;

export function GamesPage() {
  const { address } = useAccount();
  const [active, setActive] = useState<GameKind | null>(null);
  const [energies, setEnergies] = useState<EnergyMap>({});
  const [busyGameType, setBusyGameType] = useState<GameType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { buyEnergy, buyError, resetBuyError } = usePlayGame();

  const refreshEnergies = useCallback(async () => {
    const authed = getAuthedApi(address);
    if (!authed) {
      setEnergies({});
      return;
    }
    try {
      const res = await authed.user.numbers.$get();
      if (!res.ok) return;
      const body = (await res.json()) as { energies: Record<string, number> };
      const next: EnergyMap = {};
      for (const g of GAMES) {
        next[g.gameType] = body.energies[String(g.gameType)] ?? 0;
      }
      setEnergies(next);
    } catch {
      // ignore — buttons fall back to the always-allow "Play" label
    }
  }, [address]);

  useEffect(() => {
    // Fetch-then-setState pattern (analogous to useAuth's auth check). The
    // setState is gated by an async await, not synchronous within the effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    void refreshEnergies();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshEnergies]);

  // Surface the buy-side error so the user knows why nothing opened. Derive
  // it from the hook's state during render so we avoid an extra setState
  // effect (and the cascading-render warning that comes with it).
  const buyErrorMsg =
    buyError === 'insufficient_balance'
      ? 'Not enough balance to buy energy. Please top up USDT/USDC/USDm.'
      : buyError === 'submit_failed'
        ? 'Purchase confirmed on-chain but failed to register. Try again in a moment.'
        : buyError === 'no_wallet'
          ? 'Please connect your wallet first.'
          : null;
  const displayError = errorMsg ?? buyErrorMsg;

  const handlePlay = useCallback(
    async (game: GameSummary) => {
      setErrorMsg(null);
      resetBuyError();
      const current = energies[game.gameType] ?? 0;

      if (current > 0) {
        setActive(game.kind);
        return;
      }

      setBusyGameType(game.gameType);
      const ok = await buyEnergy(game.gameType);
      setBusyGameType(null);

      if (!ok) return;

      await refreshEnergies();
      setActive(game.kind);
    },
    [buyEnergy, energies, refreshEnergies, resetBuyError]
  );

  const handleClose = useCallback(() => {
    setActive(null);
    // Energy was just spent inside the game — re-fetch so the next play
    // shows the right state without a page refresh.
    void refreshEnergies();
  }, [refreshEnergies]);

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Games" subtitle="Play mini games and earn points!" />
      {displayError && (
        <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">
          {displayError}
        </div>
      )}
      <div className="space-y-3">
        {GAMES.map((g) => (
          <GameCard
            key={g.kind}
            game={g}
            energy={energies[g.gameType] ?? null}
            busy={busyGameType === g.gameType}
            onPlay={() => {
              void handlePlay(g);
            }}
          />
        ))}
      </div>

      <TriviaGame open={active === 'trivia'} onClose={handleClose} />
      <GuessThePlayerGame open={active === 'guess_player'} onClose={handleClose} />
      <MatchTheFlagGame open={active === 'match_flag'} onClose={handleClose} />
    </div>
  );
}
