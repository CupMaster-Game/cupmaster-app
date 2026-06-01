import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getAuthedApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface TriviaGameProps {
  open: boolean;
  onClose: () => void;
}

type AnswerLetter = 'A' | 'B' | 'C' | 'D';

interface TriviaQuestion {
  question_id: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: AnswerLetter;
}

type Phase = 'loading' | 'playing' | 'ending' | 'done' | 'error';

const QUESTION_SECONDS = 10;

export function TriviaGame({ open, onClose }: TriviaGameProps) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [gamePlayId, setGamePlayId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<AnswerLetter | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tracks the active session so a stale resolve from a previous open() can't
  // overwrite state after the user closes & re-opens the modal.
  const sessionRef = useRef(0);

  const reset = useCallback(() => {
    setPhase('loading');
    setQuestions([]);
    setGamePlayId(null);
    setIdx(0);
    setPicked(null);
    setTimeLeft(QUESTION_SECONDS);
    setFinalScore(null);
    setErrorMsg(null);
  }, []);

  const close = useCallback(() => {
    sessionRef.current += 1;
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const session = ++sessionRef.current;

    // All state writes live inside the async IIFE so they happen on a
    // microtask, not synchronously within the effect body.
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
        const res = await authed.game.football_trivia.start.$post();
        if (sessionRef.current !== session) return;
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? 'Failed to start game');
        }

        const body = (await res.json()) as {
          game_play_id: string;
          questions: TriviaQuestion[];
        };

        if (body.questions.length === 0) throw new Error('No questions available');

        if (sessionRef.current !== session) return;
        setQuestions(body.questions);
        setGamePlayId(body.game_play_id);
        setIdx(0);
        setPicked(null);
        setTimeLeft(QUESTION_SECONDS);
        setPhase('playing');
      } catch (err) {
        if (sessionRef.current !== session) return;
        setPhase('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to start game');
      }
    })();
  }, [open, address]);

  const total = questions.length;
  const q = questions[idx];

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

  const advance = useCallback(() => {
    if (idx >= total - 1) {
      void finishGame();
      return;
    }
    setIdx(idx + 1);
    setPicked(null);
    setTimeLeft(QUESTION_SECONDS);
  }, [idx, total, finishGame]);

  // Per-question 10-second countdown. Pauses once the user picks. When it
  // reaches 0 with no answer, auto-advance (no points recorded).
  useEffect(() => {
    if (phase !== 'playing') return;
    if (picked !== null) return;
    if (timeLeft <= 0) {
      // Defer the advance() so we don't dispatch setState during the same
      // render commit that this effect ran in.
      const id = setTimeout(() => {
        advance();
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
  }, [phase, picked, timeLeft, advance]);

  function pickAnswer(letter: AnswerLetter) {
    if (picked !== null || phase !== 'playing' || !q || !gamePlayId) return;
    setPicked(letter);
    const authed = getAuthedApi(address);
    if (!authed) return;
    // Fire-and-forget: server buffers the answer; /game/end flushes the
    // buffer before computing the score. A dropped action only loses points
    // for that one question, never the whole round.
    void authed.game.action
      .$post({
        json: {
          game_play_id: gamePlayId,
          action_type: 'trivia_answer',
          intval: q.question_id,
          textval: letter,
        },
      })
      .catch(() => {
        // network error on a single event isn't fatal — the round can still end
      });
  }

  if (phase === 'loading') {
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Football Trivia">
        <p className="py-6 text-center text-sm text-text-muted">Loading questions…</p>
      </Modal>
    );
  }

  if (phase === 'ending') {
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Football Trivia">
        <p className="py-6 text-center text-sm text-text-muted">Scoring your answers…</p>
      </Modal>
    );
  }

  if (phase === 'error') {
    return (
      <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Football Trivia">
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-gold/15">
            <Trophy className="h-8 w-8 text-accent-gold" />
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

  // phase === 'playing'
  if (!q) return null;
  const options: { letter: AnswerLetter; text: string }[] = [
    { letter: 'A', text: q.option_a },
    { letter: 'B', text: q.option_b },
    { letter: 'C', text: q.option_c },
    { letter: 'D', text: q.option_d },
  ];

  return (
    <Modal dismissOnBackdrop={false} open={open} onClose={close} title="Football Trivia">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Question {idx + 1} of {total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${(((idx + 1) / total) * 100).toString()}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-balance">{q.question}</p>
          <span
            className={cn(
              'ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              timeLeft <= 3 ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-elevated text-text-muted'
            )}
          >
            {timeLeft}s
          </span>
        </div>
        <div className="space-y-2">
          {options.map((opt) => {
            const isPicked = picked === opt.letter;
            const isCorrect = opt.letter === q.correct_answer;
            const locked = picked !== null;
            const showCorrect = locked && isCorrect;
            const showWrongPick = locked && isPicked && !isCorrect;
            return (
              <button
                key={opt.letter}
                type="button"
                onClick={() => {
                  pickAnswer(opt.letter);
                }}
                disabled={locked}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
                  !locked && 'border-border-default bg-bg-elevated hover:border-border-strong',
                  showCorrect && 'border-accent-green bg-accent-green/15 text-accent-green',
                  showWrongPick && 'border-accent-red bg-accent-red/15 text-accent-red',
                  locked && !isPicked && !isCorrect && 'opacity-50'
                )}
              >
                <span>
                  <span className="mr-2 inline-block w-5 text-text-muted">{opt.letter}.</span>
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <Button fullWidth onClick={advance}>
            {idx >= total - 1 ? 'See Results' : 'Next Question'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
