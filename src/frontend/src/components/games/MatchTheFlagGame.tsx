import { useEffect, useMemo, useState } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/ui/Flag';
import { FLAG_PAIRS } from '@/data/games';
import type { FlagMatchPair } from '@/types';
import { cn } from '@/lib/cn';

interface MatchTheFlagGameProps {
  open: boolean;
  onClose: () => void;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

const ROUND_SIZE = 4;

export function MatchTheFlagGame({ open, onClose }: MatchTheFlagGameProps) {
  const [round, setRound] = useState(0);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const pool = useMemo<readonly FlagMatchPair[]>(() => FLAG_PAIRS, []);
  const totalRounds = Math.floor(pool.length / ROUND_SIZE);

  const currentPairs = useMemo(() => {
    const start = round * ROUND_SIZE;
    return pool.slice(start, start + ROUND_SIZE);
  }, [pool, round]);

  const shuffledNames = useMemo(
    () => shuffle(currentPairs.map((p) => p.countryName)),
    [currentPairs],
  );
  const shuffledFlags = useMemo(
    () => shuffle(currentPairs.map((p) => p.countryCode)),
    [currentPairs],
  );

  useEffect(() => {
    if (!open) return;
    if (
      Object.keys(matched).length === currentPairs.length &&
      currentPairs.length > 0
    ) {
      const timer = setTimeout(() => {
        if (round + 1 >= totalRounds) {
          setDone(true);
        } else {
          setRound(round + 1);
          setMatched({});
          setSelectedFlag(null);
        }
      }, 800);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [matched, currentPairs.length, round, totalRounds, open]);

  function close() {
    setRound(0);
    setMatched({});
    setSelectedFlag(null);
    setScore(0);
    setDone(false);
    onClose();
  }

  function reset() {
    setRound(0);
    setMatched({});
    setSelectedFlag(null);
    setScore(0);
    setDone(false);
  }

  function onFlagClick(code: string) {
    if (matched[code]) return;
    setSelectedFlag(code);
  }

  function onNameClick(name: string) {
    if (!selectedFlag) return;
    if (Object.values(matched).includes(name)) return;
    const target = currentPairs.find(
      (p) => p.countryCode === selectedFlag,
    )?.countryName;
    if (target === name) {
      setMatched({ ...matched, [selectedFlag]: name });
      setScore((s) => s + 25);
    } else {
      // miss: small shake by clearing selection
      setScore((s) => Math.max(s - 5, 0));
    }
    setSelectedFlag(null);
  }

  if (done) {
    return (
      <Modal open={open} onClose={close} title="All Matched!">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-orange/15">
            <Trophy className="h-8 w-8 text-accent-orange" />
          </div>
          <p className="text-2xl font-extrabold">{score} pts</p>
          <p className="text-sm text-text-muted">
            You matched every flag to its country!
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={reset}
              iconLeft={<RotateCcw className="h-4 w-4" />}
            >
              Play Again
            </Button>
            <Button fullWidth onClick={close}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="Match the Flag">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Round {round + 1} of {totalRounds}
          </span>
          <span>Score: {score}</span>
        </div>

        <p className="text-sm text-text-muted">
          Tap a flag, then tap the matching country name.
        </p>

        <div>
          <p className="label mb-2">Flags</p>
          <div className="grid grid-cols-4 gap-2">
            {shuffledFlags.map((code) => {
              const isMatched = Boolean(matched[code]);
              const isSelected = code === selectedFlag;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => { onFlagClick(code); }}
                  disabled={isMatched}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-xl border bg-bg-elevated text-3xl transition-all',
                    isMatched && 'border-brand-500 bg-brand-500/15 opacity-60',
                    isSelected &&
                      'border-brand-500 shadow-glow-soft scale-105',
                    !isMatched &&
                      !isSelected &&
                      'border-border-default hover:border-border-strong',
                  )}
                >
                  <Flag code={code} size="lg" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="label mb-2">Countries</p>
          <div className="grid grid-cols-2 gap-2">
            {shuffledNames.map((name) => {
              const isMatched = Object.values(matched).includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onNameClick(name); }}
                  disabled={isMatched || !selectedFlag}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-semibold transition-all',
                    isMatched
                      ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                      : selectedFlag
                        ? 'border-border-strong bg-bg-elevated text-text-primary hover:border-brand-500'
                        : 'border-border-subtle bg-bg-subtle text-text-muted',
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
