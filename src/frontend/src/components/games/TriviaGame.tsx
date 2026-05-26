import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Trophy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getAuthedApi } from '@/lib/api';
import { cn } from '@/lib/cn';

interface TriviaGameProps {
  open: boolean;
  onClose: () => void;
}

interface TriviaQuestion {
  question_id: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

type AnswerLetter = 'A' | 'B' | 'C' | 'D';

type Phase = 'loading' | 'playing' | 'ending' | 'done' | 'error';

const POINTS_PER_CORRECT = 50;

export function TriviaGame({ open, onClose }: TriviaGameProps) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [gamePlayId, setGamePlayId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<AnswerLetter | null>(null);
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
    const authed = getAuthedApi(address);
    if (!authed) {
      setPhase('error');
      setErrorMsg('Please sign in to play.');
      return;
    }

    setPhase('loading');
    setErrorMsg(null);

    void (async () => {
      try {
        const [qRes, startRes] = await Promise.all([
          authed.game.trivia.questions.$get(),
          authed.game.start.$post({ json: { game_type: 101 } }),
        ]);

        if (sessionRef.current !== session) return;

        if (!qRes.ok) throw new Error(`Failed to load questions (HTTP ${qRes.status.toString()})`);
        if (!startRes.ok) {
          const body = (await startRes.json()) as { error?: string };
          throw new Error(body.error ?? 'Failed to start game');
        }

        const qBody = (await qRes.json()) as { questions: TriviaQuestion[] };
        const startBody = (await startRes.json()) as { game_play_id: string };

        if (qBody.questions.length === 0) throw new Error('No questions available');

        if (sessionRef.current !== session) return;
        setQuestions(qBody.questions);
        setGamePlayId(startBody.game_play_id);
        setIdx(0);
        setPicked(null);
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

  function pickAnswer(letter: AnswerLetter) {
    if (picked !== null || phase !== 'playing' || !q || !gamePlayId) return;
    setPicked(letter);
    const authed = getAuthedApi(address);
    if (!authed) return;
    // Fire-and-forget: server buffers events and the next answer/end will pick
    // them up. We don't await so the UI doesn't stall on network latency.
    void authed.game.event
      .$post({
        json: {
          game_play_id: gamePlayId,
          event_type: 'trivia_answer',
          intval: q.question_id,
          textval: letter,
        },
      })
      .catch(() => {
        // network error on a single event isn't fatal — the round can still end
      });
  }

  function nextQuestion() {
    if (!q) return;
    if (idx >= total - 1) {
      void finishGame();
      return;
    }
    setIdx(idx + 1);
    setPicked(null);
  }

  async function finishGame() {
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
  }

  if (phase === 'loading') {
    return (
      <Modal open={open} onClose={close} title="Football Trivia">
        <p className="py-6 text-center text-sm text-text-muted">Loading questions…</p>
      </Modal>
    );
  }

  if (phase === 'ending') {
    return (
      <Modal open={open} onClose={close} title="Football Trivia">
        <p className="py-6 text-center text-sm text-text-muted">Scoring your answers…</p>
      </Modal>
    );
  }

  if (phase === 'error') {
    return (
      <Modal open={open} onClose={close} title="Football Trivia">
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
    const correct = finalScore ?? 0;
    return (
      <Modal open={open} onClose={close} title="Round Complete!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-gold/15">
            <Trophy className="h-8 w-8 text-accent-gold" />
          </div>
          <p className="text-2xl font-extrabold">
            {correct} / {total}
          </p>
          <p className="text-sm text-text-muted">
            +{correct * POINTS_PER_CORRECT} points earned this round
          </p>
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
    <Modal open={open} onClose={close} title="Football Trivia">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              Question {idx + 1} of {total}
            </span>
            <span>
              {q.category} · {q.difficulty}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${(((idx + 1) / total) * 100).toString()}%` }}
            />
          </div>
        </div>
        <p className="text-base font-semibold text-balance">{q.question}</p>
        <div className="space-y-2">
          {options.map((opt) => {
            const isPicked = picked === opt.letter;
            const locked = picked !== null;
            return (
              <button
                key={opt.letter}
                type="button"
                onClick={() => { pickAnswer(opt.letter); }}
                disabled={locked}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
                  !locked && 'border-border-default bg-bg-elevated hover:border-border-strong',
                  locked && isPicked && 'border-brand-500 bg-brand-500/15 text-brand-300',
                  locked && !isPicked && 'opacity-50',
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
          <Button fullWidth onClick={nextQuestion}>
            {idx >= total - 1 ? 'See Results' : 'Next Question'}
          </Button>
        )}
      </div>
    </Modal>
  );
}

