import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getAuthedApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface MatchTheFlagGameProps {
  open: boolean;
  onClose: () => void;
}

interface TeamMeta {
  team_id: string;
  team_name: string;
  logo: string;
}

interface SelectedFlags {
  level1: string[];
  level2: string[];
  level3: string[];
}

type Phase = 'loading' | 'playing' | 'levelComplete' | 'ending' | 'done' | 'error';

interface LevelConfig {
  cols: number;
  rows: number;
  seconds: number;
  key: keyof SelectedFlags;
  label: string;
}

const LEVELS: readonly LevelConfig[] = [
  { cols: 3, rows: 4, seconds: 30, key: 'level1', label: 'Level 1' },
  { cols: 4, rows: 4, seconds: 40, key: 'level2', label: 'Level 2' },
  { cols: 4, rows: 5, seconds: 60, key: 'level3', label: 'Level 3' },
];
const FIRST_LEVEL: LevelConfig = LEVELS[0] ?? {
  cols: 3,
  rows: 4,
  seconds: 15,
  key: 'level1',
  label: 'Level 1',
};

const FLIP_BACK_MS = 800;

export function MatchTheFlagGame({ open, onClose }: MatchTheFlagGameProps) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gamePlayId, setGamePlayId] = useState<string | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<SelectedFlags | null>(null);
  const [teamsById, setTeamsById] = useState<Record<string, TeamMeta>>({});

  const [levelIdx, setLevelIdx] = useState(0);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(FIRST_LEVEL.seconds);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // Tracks the active session so a stale resolve from a previous open() can't
  // overwrite state after the user closes & re-opens the modal.
  const sessionRef = useRef(0);

  const reset = useCallback(() => {
    setPhase('loading');
    setErrorMsg(null);
    setGamePlayId(null);
    setSelectedFlags(null);
    setTeamsById({});
    setLevelIdx(0);
    setMatched(new Set());
    setFlipped([]);
    setTimeLeft(FIRST_LEVEL.seconds);
    setFinalScore(null);
  }, []);

  const close = useCallback(() => {
    sessionRef.current += 1;
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const session = ++sessionRef.current;

    void (async () => {
      const authed = getAuthedApi(address);
      if (!authed) {
        if (sessionRef.current !== session) return;
        setPhase('error');
        setErrorMsg('Please sign in to play.');
        return;
      }

      setPhase('loading');
      setErrorMsg(null);

      try {
        const res = await authed.game.match_the_flag.start.$post();
        if (sessionRef.current !== session) return;
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? 'Failed to start game');
        }

        const body = (await res.json()) as {
          game_play_id: string;
          selected_flags: SelectedFlags;
          teams: TeamMeta[];
        };

        if (sessionRef.current !== session) return;
        setGamePlayId(body.game_play_id);
        setSelectedFlags(body.selected_flags);
        setTeamsById(
          body.teams.reduce<Record<string, TeamMeta>>((acc, t) => {
            acc[t.team_id] = t;
            return acc;
          }, {})
        );
        setLevelIdx(0);
        setMatched(new Set());
        setFlipped([]);
        setTimeLeft(FIRST_LEVEL.seconds);
        setPhase('playing');
      } catch (err) {
        if (sessionRef.current !== session) return;
        setPhase('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to start game');
      }
    })();
  }, [open, address]);

  const level = LEVELS[levelIdx];
  const deck = level && selectedFlags ? selectedFlags[level.key] : null;
  const totalPairs = deck ? deck.length / 2 : 0;

  const finishGame = useCallback(async () => {
    if (!gamePlayId) return;
    const authed = getAuthedApi(address);
    if (!authed) {
      setPhase('error');
      setErrorMsg('Please sign in to play.');
      return;
    }
    const session = sessionRef.current;
    setPhase('ending');
    try {
      const res = await authed.game.end.$post({ json: { game_play_id: gamePlayId } });
      if (sessionRef.current !== session) return;
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to finish game');
      }
      const body = (await res.json()) as { score: number };
      setFinalScore(body.score);
      setPhase('done');
    } catch (err) {
      if (sessionRef.current !== session) return;
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to finish game');
    }
  }, [address, gamePlayId]);

  const advanceLevel = useCallback(() => {
    if (levelIdx >= LEVELS.length - 1) {
      void finishGame();
      return;
    }
    const next = levelIdx + 1;
    const nextLevel = LEVELS[next];
    if (!nextLevel) return;
    setLevelIdx(next);
    setMatched(new Set());
    setFlipped([]);
    setTimeLeft(nextLevel.seconds);
    setPhase('playing');
  }, [levelIdx, finishGame]);

  // Level countdown: ticks down every second while playing. When it hits 0
  // (or all pairs are matched) the level ends. The transition to
  // 'levelComplete' is deferred to a microtask so we don't dispatch setState
  // during the same render commit this effect ran in.
  useEffect(() => {
    if (phase !== 'playing') return;
    const allMatched = totalPairs > 0 && matched.size === totalPairs * 2;
    if (timeLeft <= 0 || allMatched) {
      const id = setTimeout(() => {
        setPhase('levelComplete');
      }, 0);
      return () => {
        clearTimeout(id);
      };
    }
    const id = setTimeout(() => {
      setTimeLeft((v) => v - 1);
    }, 1000);
    return () => {
      clearTimeout(id);
    };
  }, [phase, timeLeft, matched, totalPairs]);

  function onCardClick(index: number) {
    if (phase !== 'playing' || !deck || !gamePlayId) return;
    if (matched.has(index)) return;
    if (flipped.includes(index)) return;
    if (flipped.length >= 2) return;

    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    const [a, b] = nextFlipped as [number, number];
    if (deck[a] === deck[b]) {
      const nextMatched = new Set(matched);
      nextMatched.add(a);
      nextMatched.add(b);
      setMatched(nextMatched);
      setFlipped([]);

      const authed = getAuthedApi(address);
      if (authed) {
        // Fire-and-forget: server buffers the action and validates at
        // /game/end time. A dropped action only costs 2 points for that pair.
        void authed.game.action
          .$post({
            json: {
              game_play_id: gamePlayId,
              action_type: 'flag_match',
              extra_data: { level: levelIdx + 1, matching_indexes: [a, b] },
            },
          })
          .catch(() => {
            // single dropped event isn't fatal
          });
      }
    } else {
      // Mismatch: leave the two cards face-up briefly, then flip back.
      setTimeout(() => {
        setFlipped([]);
      }, FLIP_BACK_MS);
    }
  }

  if (phase === 'loading') {
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Match the Flag">
        <p className="py-6 text-center text-sm text-text-muted">Loading deck…</p>
      </Modal>
    );
  }

  if (phase === 'ending') {
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Match the Flag">
        <p className="py-6 text-center text-sm text-text-muted">Scoring your matches…</p>
      </Modal>
    );
  }

  if (phase === 'error') {
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Match the Flag">
        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-accent-red">{errorMsg ?? 'Something went wrong.'}</p>
          <Button fullWidth onClick={close}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  if (phase === 'done') {
    const score = finalScore ?? 0;
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Round Complete!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-orange/15">
            <Trophy className="h-8 w-8 text-accent-orange" />
          </div>
          <p className="text-2xl font-extrabold">{score} pts</p>
          <p className="text-sm text-text-muted">+{score} points earned this round</p>
          <Button fullWidth onClick={close}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  if (phase === 'levelComplete') {
    const isLast = levelIdx >= LEVELS.length - 1;
    const pairsFound = matched.size / 2;
    const label = level ? level.label : 'Level';
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title={`${label} Complete!`}>
        <div className="space-y-4 text-center">
          <p className="text-sm text-text-muted">
            You matched {pairsFound} of {totalPairs} pairs.
          </p>
          <Button fullWidth onClick={advanceLevel}>
            {isLast ? 'See Results' : 'Next Level'}
          </Button>
        </div>
      </Modal>
    );
  }

  // phase === 'playing'
  if (!level || !deck) return null;

  return (
    <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Match the Flag">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {level.label} · {matched.size / 2}/{totalPairs} pairs
          </span>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              timeLeft <= 5 ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-elevated text-text-muted'
            )}
          >
            {timeLeft}s
          </span>
        </div>

        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${level.cols.toString()}, minmax(0, 1fr))` }}
        >
          {deck.map((teamId, idx) => {
            const isMatched = matched.has(idx);
            const isFlipped = flipped.includes(idx);
            const showFace = isMatched || isFlipped;
            const team = teamsById[teamId];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onCardClick(idx);
                }}
                disabled={isMatched}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg border transition-all',
                  showFace
                    ? 'border-brand-500/60 bg-bg-elevated'
                    : 'border-border-default bg-bg-subtle hover:border-border-strong',
                  isMatched && 'opacity-60'
                )}
                aria-label={showFace && team ? team.team_name : 'Hidden card'}
              >
                {showFace && team ? (
                  <img
                    src={`/assets/team-logos/${team.logo}`}
                    alt={team.team_name}
                    className="h-3/4 w-3/4 object-contain"
                  />
                ) : (
                  <img
                    src="/assets/brand/logo-icon.png"
                    alt=""
                    aria-hidden
                    className="h-1/2 w-1/2 object-contain opacity-25"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
