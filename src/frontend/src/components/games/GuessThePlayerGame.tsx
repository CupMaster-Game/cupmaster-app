import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getAuthedApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface GuessThePlayerGameProps {
  open: boolean;
  onClose: () => void;
}

interface PlayerRound {
  player_id: number;
  player: string;
  hint_1: string;
  hint_2: string;
  hint_3: string;
  hint_4: string;
  hint_5: string;
}

type Phase = 'loading' | 'playing' | 'roundComplete' | 'ending' | 'done' | 'error';

const HINT_SECONDS = 10;
const HINTS_PER_ROUND = 5;
const POINTS_BY_HINTS = [50, 40, 30, 20, 10] as const;

function getHint(p: PlayerRound, index: number): string {
  switch (index) {
    case 1:
      return p.hint_1;
    case 2:
      return p.hint_2;
    case 3:
      return p.hint_3;
    case 4:
      return p.hint_4;
    case 5:
      return p.hint_5;
    default:
      return '';
  }
}

// Accepts a guess if it equals the player's first name OR last name
// (case-insensitive, whitespace-trimmed).
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function isCorrectGuess(answer: string, fullName: string): boolean {
  const guess = normalize(answer);
  if (!guess) return false;
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return (
    (first !== undefined && normalize(first) === guess) ||
    (last !== undefined && normalize(last) === guess)
  );
}

export function GuessThePlayerGame({ open, onClose }: GuessThePlayerGameProps) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gamePlayId, setGamePlayId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRound[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [revealedHints, setRevealedHints] = useState(1);
  const [timeLeft, setTimeLeft] = useState(HINT_SECONDS);
  const [guess, setGuess] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const sessionRef = useRef(0);

  const reset = useCallback(() => {
    setPhase('loading');
    setErrorMsg(null);
    setGamePlayId(null);
    setPlayers([]);
    setRoundIdx(0);
    setRevealedHints(1);
    setTimeLeft(HINT_SECONDS);
    setGuess('');
    setWrongGuess(false);
    setRoundScores([]);
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
        const res = await authed.game.guess_the_player.start.$post();
        if (sessionRef.current !== session) return;
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? 'Failed to start game');
        }

        const body = (await res.json()) as {
          game_play_id: string;
          players: PlayerRound[];
        };

        if (body.players.length === 0) throw new Error('No players available');

        if (sessionRef.current !== session) return;
        setGamePlayId(body.game_play_id);
        setPlayers(body.players);
        setRoundIdx(0);
        setRevealedHints(1);
        setTimeLeft(HINT_SECONDS);
        setGuess('');
        setRoundScores([]);
        setPhase('playing');
      } catch (err) {
        if (sessionRef.current !== session) return;
        setPhase('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to start game');
      }
    })();
  }, [open, address]);

  const total = players.length;
  const player = players[roundIdx];

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

  const advanceRound = useCallback(() => {
    if (roundIdx >= total - 1) {
      void finishGame();
      return;
    }
    setRoundIdx(roundIdx + 1);
    setRevealedHints(1);
    setTimeLeft(HINT_SECONDS);
    setGuess('');
    setWrongGuess(false);
    setPhase('playing');
  }, [roundIdx, total, finishGame]);

  // 10-second timer per hint. When it reaches 0, reveal the next hint (or end
  // the round if all 5 are shown). Paused once the round transitions out of
  // 'playing' (e.g. on a correct guess or completion).
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      if (revealedHints >= HINTS_PER_ROUND) {
        // No more hints — round ends with 0 points.
        const id = setTimeout(() => {
          setRoundScores((s) => [...s, 0]);
          setPhase('roundComplete');
        }, 0);
        return () => {
          clearTimeout(id);
        };
      }
      const id = setTimeout(() => {
        setRevealedHints((n) => n + 1);
        setTimeLeft(HINT_SECONDS);
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
  }, [phase, timeLeft, revealedHints]);

  function submitGuess() {
    if (phase !== 'playing' || !player || !gamePlayId) return;
    if (!isCorrectGuess(guess, player.player)) {
      setGuess('');
      setWrongGuess(true);
      return;
    }
    setWrongGuess(false);
    const earned = POINTS_BY_HINTS[revealedHints - 1] ?? 0;
    setRoundScores((s) => [...s, earned]);

    const authed = getAuthedApi(address);
    if (authed) {
      void authed.game.action
        .$post({
          json: {
            game_play_id: gamePlayId,
            action_type: 'guess_player',
            extra_data: { player_id: player.player_id, used_hint_count: revealedHints },
          },
        })
        .catch(() => {
          // single dropped event isn't fatal
        });
    }
    setPhase('roundComplete');
  }

  if (phase === 'loading') {
    return (
      <Modal open={open} onClose={close} title="Guess the Player">
        <p className="py-6 text-center text-sm text-text-muted">Loading clues…</p>
      </Modal>
    );
  }

  if (phase === 'ending') {
    return (
      <Modal open={open} onClose={close} title="Guess the Player">
        <p className="py-6 text-center text-sm text-text-muted">Scoring your guesses…</p>
      </Modal>
    );
  }

  if (phase === 'error') {
    return (
      <Modal open={open} onClose={close} title="Guess the Player">
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
      <Modal open={open} onClose={close} title="Game Complete!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15">
            <Trophy className="h-8 w-8 text-brand-400" />
          </div>
          <p className="text-2xl font-extrabold">{score} pts</p>
          <p className="text-sm text-text-muted">Nice detective work!</p>
          <Button fullWidth onClick={close}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  if (phase === 'roundComplete') {
    const isLast = roundIdx >= total - 1;
    const earned = roundScores[roundIdx] ?? 0;
    const correct = earned > 0;
    const answer = player?.player ?? '';
    return (
      <Modal open={open} onClose={close} title={`Round ${(roundIdx + 1).toString()} Complete!`}>
        <div className="space-y-4 text-center">
          {correct ? (
            <>
              <p className="text-2xl font-extrabold text-brand-300">+{earned} pts</p>
              <p className="text-sm text-text-muted">Correct! The player was {answer}.</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-accent-red">0 pts</p>
              <p className="text-sm text-text-muted">The player was {answer}.</p>
            </>
          )}
          <Button fullWidth onClick={advanceRound}>
            {isLast ? 'See Results' : 'Next Round'}
          </Button>
        </div>
      </Modal>
    );
  }

  // phase === 'playing'
  if (!player) return null;

  return (
    <Modal open={open} onClose={close} title="Guess the Player">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Round {roundIdx + 1} of {total}
          </span>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              timeLeft <= 3 ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-elevated text-text-muted'
            )}
          >
            {timeLeft}s
          </span>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="label text-brand-300">Clues</p>
            <span className="text-xs font-semibold text-text-muted">
              {POINTS_BY_HINTS[revealedHints - 1] ?? 0} pts available
            </span>
          </div>
          <ol className="space-y-2 text-sm">
            {Array.from({ length: revealedHints }).map((_, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-text-muted">#{i + 1}</span>
                <span className="text-text-secondary">{getHint(player, i + 1)}</span>
              </li>
            ))}
          </ol>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitGuess();
          }}
          className="space-y-2"
        >
          <input
            type="text"
            value={guess}
            onChange={(e) => {
              setGuess(e.target.value);
              if (wrongGuess) setWrongGuess(false);
            }}
            placeholder="First name or last name"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-border-default bg-bg-elevated px-4 py-3 text-sm font-medium outline-none placeholder:text-text-muted focus:border-border-strong"
          />
          {wrongGuess && (
            <p className="text-xs font-semibold text-accent-red">wrong answer, try again</p>
          )}
          <Button type="submit" fullWidth disabled={guess.trim() === ''}>
            Submit Guess
          </Button>
        </form>
      </div>
    </Modal>
  );
}
