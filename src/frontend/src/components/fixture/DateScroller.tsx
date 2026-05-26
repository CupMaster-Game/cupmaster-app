import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  formatDayMonth,
  formatWeekday,
  isSameDay,
  startOfDay,
} from '@/lib/date';
import { cn } from '@/lib/cn';

interface DateScrollerProps {
  selected: Date;
  onSelect: (date: Date) => void;
  rangeBefore?: number;
  rangeAfter?: number;
}

export function DateScroller({
  selected,
  onSelect,
  rangeBefore = 7,
  rangeAfter = 14,
}: DateScrollerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => {
    const list: Date[] = [];
    for (let i = -rangeBefore; i <= rangeAfter; i++) {
      list.push(addDays(today, i));
    }
    return list;
  }, [today, rangeBefore, rangeAfter]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const node = selectedRef.current;
    if (!container || !node) return;

    // Use getBoundingClientRect rather than offsetLeft so positioning stays
    // correct regardless of which ancestor happens to be the offsetParent
    // (varies between layouts and breakpoints).
    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const nodeLeftInContainer =
      nodeRect.left - containerRect.left + container.scrollLeft;
    const target =
      nodeLeftInContainer - container.clientWidth / 2 + node.clientWidth / 2;

    container.scrollTo({
      left: Math.max(target, 0),
      behavior: 'smooth',
    });
  }, [selected]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="card flex h-16 w-11 shrink-0 items-center justify-center text-text-secondary hover:text-text-primary"
        aria-label="Previous day"
        onClick={() => { onSelect(addDays(selected, -1)); }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={scrollRef}
        className="no-scrollbar flex flex-1 gap-2 overflow-x-auto scroll-smooth"
      >
        {days.map((d) => {
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          const { day, month } = formatDayMonth(d);
          const weekday = formatWeekday(d);
          return (
            <button
              key={d.toISOString()}
              ref={isSelected ? selectedRef : null}
              type="button"
              onClick={() => { onSelect(d); }}
              className={cn(
                'relative flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border transition-all',
                isSelected
                  ? 'border-brand-500 bg-brand-500/15 shadow-glow-soft'
                  : 'border-border-subtle bg-bg-surface hover:border-border-default',
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-wider',
                  isSelected ? 'text-brand-300' : 'text-text-muted',
                )}
              >
                {isToday ? 'Today' : weekday}
              </span>
              <span
                className={cn(
                  'text-lg font-bold leading-none',
                  isSelected ? 'text-text-primary' : 'text-text-primary',
                )}
              >
                {day}
              </span>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider',
                  isSelected ? 'text-brand-300' : 'text-text-muted',
                )}
              >
                {month}
              </span>
              {isToday && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="card flex h-16 w-11 shrink-0 items-center justify-center text-text-secondary hover:text-text-primary"
        aria-label="Next day"
        onClick={() => { onSelect(addDays(selected, 1)); }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
