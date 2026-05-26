import { useState } from 'react';
import { Eye, Check, X, Trophy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PLAYER_CLUES } from '@/data/games';
import { cn } from '@/lib/cn';

interface GuessThePlayerGameProps {
  open: boolean;
  onClose: () => void;
}

export function GuessThePlayerGame({ open, onClose }: GuessThePlayerGameProps) {
  const [idx, setIdx] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const total = PLAYER_CLUES.length;
  const clue = PLAYER_CLUES[idx];
  const answered = selected !== null;

  function close() {
    setIdx(0);
    setRevealedClues(1);
    setSelected(null);
    setScore(0);
    setDone(false);
    onClose();
  }

  if (!clue) return null;

  function pick(name: string) {
    if (!clue) return;
    if (answered) return;
    setSelected(name);
    if (name === clue.name) {
      // Score scales down with each clue revealed
      const earned = Math.max(50 - (revealedClues - 1) * 15, 10);
      setScore((s) => s + earned);
    }
  }

  function next() {
    if (idx >= total - 1) {
      setDone(true);
      return;
    }
    setIdx(idx + 1);
    setRevealedClues(1);
    setSelected(null);
  }

  if (done) {
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

  return (
    <Modal open={open} onClose={close} title="Guess the Player">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Player {idx + 1} of {total}
          </span>
          <span>Score: {score}</span>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-4">
          <p className="label mb-2 text-brand-300">Clues</p>
          <ol className="space-y-2 text-sm">
            {clue.clues.slice(0, revealedClues).map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-text-muted">#{i + 1}</span>
                <span className="text-text-secondary">{c}</span>
              </li>
            ))}
          </ol>
          {revealedClues < clue.clues.length && !answered && (
            <button
              type="button"
              onClick={() => { setRevealedClues(revealedClues + 1); }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              <Eye className="h-3.5 w-3.5" />
              Reveal another clue (−15 pts)
            </button>
          )}
        </div>

        <div className="space-y-2">
          {clue.options.map((name) => {
            const isCorrect = name === clue.name;
            const isPicked = name === selected;
            return (
              <button
                key={name}
                type="button"
                onClick={() => { pick(name); }}
                disabled={answered}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                  !answered &&
                    'border-border-default bg-bg-elevated hover:border-border-strong',
                  answered &&
                    isCorrect &&
                    'border-brand-500 bg-brand-500/15 text-brand-300',
                  answered &&
                    !isCorrect &&
                    isPicked &&
                    'border-accent-red/60 bg-accent-red/10 text-accent-red',
                  answered && !isCorrect && !isPicked && 'opacity-50',
                )}
              >
                <span>{name}</span>
                {answered && isCorrect && <Check className="h-4 w-4" />}
                {answered && !isCorrect && isPicked && (
                  <X className="h-4 w-4" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <Button fullWidth onClick={next}>
            {idx >= total - 1 ? 'See Results' : 'Next Player'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
