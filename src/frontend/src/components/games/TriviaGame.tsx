import { useState } from 'react';
import { Check, X, Trophy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TRIVIA_QUESTIONS } from '@/data/games';
import { cn } from '@/lib/cn';

interface TriviaGameProps {
  open: boolean;
  onClose: () => void;
}

export function TriviaGame({ open, onClose }: TriviaGameProps) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const total = TRIVIA_QUESTIONS.length;
  const q = TRIVIA_QUESTIONS[idx];

  function reset() {
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
  }

  function close() {
    reset();
    onClose();
  }

  if (!q) return null;

  function answer(i: number) {
    if (revealed || !q) return;
    setSelected(i);
    setRevealed(true);
    if (i === q.correctIndex) setScore((s) => s + 1);
  }

  function nextQuestion() {
    if (idx >= total - 1) {
      setDone(true);
      return;
    }
    setIdx(idx + 1);
    setSelected(null);
    setRevealed(false);
  }

  if (done) {
    return (
      <Modal open={open} onClose={close} title="Round Complete!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-gold/15">
            <Trophy className="h-8 w-8 text-accent-gold" />
          </div>
          <p className="text-2xl font-extrabold">
            {score} / {total}
          </p>
          <p className="text-sm text-text-muted">
            +{score * 50} points earned this round
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={close}>
              Done
            </Button>
            <Button fullWidth onClick={reset}>
              Play Again
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="Football Trivia">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Question {idx + 1} of {total}
            </span>
            <span>Score: {score}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-base font-semibold text-balance">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isPicked = i === selected;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { answer(i); }}
                disabled={revealed}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
                  !revealed &&
                    'border-border-default bg-bg-elevated hover:border-border-strong',
                  revealed &&
                    isCorrect &&
                    'border-brand-500 bg-brand-500/15 text-brand-300',
                  revealed &&
                    !isCorrect &&
                    isPicked &&
                    'border-accent-red/60 bg-accent-red/10 text-accent-red',
                  revealed && !isCorrect && !isPicked && 'opacity-50',
                )}
              >
                <span>{opt}</span>
                {revealed && isCorrect && <Check className="h-4 w-4" />}
                {revealed && !isCorrect && isPicked && (
                  <X className="h-4 w-4" />
                )}
              </button>
            );
          })}
        </div>
        {revealed && (
          <Button fullWidth onClick={nextQuestion}>
            {idx >= total - 1 ? 'See Results' : 'Next Question'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
