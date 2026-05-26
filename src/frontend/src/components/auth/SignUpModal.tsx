import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useEffect, useMemo, useRef, useState } from 'react';

type NameStatus = null | 'checking' | 'available' | 'taken' | 'invalid' | 'too_short' | 'too_long';

interface Team {
  team_id: string;
  api_team_id: number;
  team_name: string;
  country_code: string; // 3-letter, e.g. "BRA"
  logo: string; // URL — used as flag image
  group_name: string;
}

interface SignUpModalProps {
  open: boolean;
  onClose: () => void;
  // `flag` is the team's logo URL — stored verbatim in user_mutable_data.flag.
  onSubmit: (name: string, flag: string) => Promise<void>;
  checkName: (name: string) => Promise<boolean>;
}

// Mirrors the server-side `nameSchema` regex.
const NAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function SignUpModal({ open, onClose, onSubmit, checkName }: SignUpModalProps) {
  const [name, setName] = useState('');
  const [nameStatus, setNameStatus] = useState<NameStatus>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch teams once when the modal first opens.
  useEffect(() => {
    if (!open || teams.length > 0) return undefined;
    const ctrl = { cancelled: false };
    void (async () => {
      try {
        const res = await api.teams.$get();
        const data = await res.json();
        if (!ctrl.cancelled) setTeams(data.teams);
      } catch {
        // Leave teams empty; the modal renders a "Loading teams…" fallback.
      }
    })();
    return () => {
      ctrl.cancelled = true;
    };
  }, [open, teams.length]);

  useEffect(() => {
    if (open) {
      // Allow the modal animation to finish before grabbing focus.
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        window.clearTimeout(id);
      };
    }
    // Reset on close so the next open starts clean.
    /* eslint-disable react-hooks/set-state-in-effect */
    setName('');
    setSelectedTeam(null);
    setNameStatus(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    return undefined;
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = name.trim();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (trimmed.length === 0) {
      setNameStatus(null);
      return undefined;
    }
    if (trimmed.length < 3) {
      setNameStatus('too_short');
      return undefined;
    }
    if (trimmed.length > 50) {
      setNameStatus('too_long');
      return undefined;
    }
    if (!NAME_REGEX.test(trimmed)) {
      setNameStatus('invalid');
      return undefined;
    }
    setNameStatus('checking');
    /* eslint-enable react-hooks/set-state-in-effect */

    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        const available = await checkName(trimmed);
        setNameStatus(available ? 'available' : 'taken');
      })();
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [name, checkName]);

  const canSubmit = nameStatus === 'available' && selectedTeam !== null && !submitting;

  const statusText = useMemo<string>(() => {
    switch (nameStatus) {
      case 'available':
        return 'Name is available';
      case 'taken':
        return 'Name is already taken';
      case 'checking':
        return 'Checking…';
      case 'too_short':
        return 'Name must be at least 3 characters';
      case 'too_long':
        return 'Name must be at most 50 characters';
      case 'invalid':
        return 'Letters, numbers, and underscores only';
      default:
        return '';
    }
  }, [nameStatus]);

  const statusToneClass =
    nameStatus === 'available'
      ? 'text-brand-400'
      : nameStatus === 'checking'
        ? 'text-text-muted'
        : nameStatus
          ? 'text-accent-red'
          : 'text-transparent';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    void onSubmit(name.trim(), selectedTeam.logo).finally(() => {
      setSubmitting(false);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label mb-1.5 block" htmlFor="signup-name">
            Display name
          </label>
          <input
            id="signup-name"
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="e.g. messi_10"
            maxLength={50}
            autoComplete="off"
            className="input"
          />
          <div className={cn('mt-1.5 min-h-[1rem] text-xs font-medium', statusToneClass)}>
            {statusText || ' '}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="label">Pick your flag</span>
            {selectedTeam && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                Selected:
                <img
                  src={'/assets/team-logos/' + selectedTeam.logo}
                  alt={selectedTeam.team_name}
                  className="h-4 w-6 rounded-sm object-cover"
                />
                <span className="text-text-secondary">{selectedTeam.team_name}</span>
              </span>
            )}
          </div>
          <div className="no-scrollbar max-h-56 overflow-y-auto rounded-xl border border-border-subtle bg-bg-elevated p-2">
            {teams.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">Loading teams…</div>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {teams.map((team) => {
                  const active = selectedTeam?.team_id === team.team_id;
                  return (
                    <button
                      key={team.team_id}
                      type="button"
                      onClick={() => {
                        setSelectedTeam(team);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors',
                        active
                          ? 'border-brand-500 bg-brand-500/10 text-text-primary'
                          : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong'
                      )}
                      title={team.team_name}
                    >
                      <img
                        src={'/assets/team-logos/' + team.logo}
                        alt={team.team_name}
                        loading="lazy"
                        className="h-6 w-9 rounded-sm object-cover"
                      />
                      <span className="truncate w-full text-center">{team.team_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit} fullWidth>
            {submitting ? 'Signing up…' : 'Sign Up'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
