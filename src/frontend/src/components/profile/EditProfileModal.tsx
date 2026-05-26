import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api, getAuthedApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

type NameStatus =
  | null
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'too_short'
  | 'too_long';

interface Team {
  team_id: string;
  api_team_id: number;
  team_name: string;
  country_code: string;
  logo: string;
  group_name: string;
}

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialFlag: string;
}

const NAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function EditProfileModal({
  open,
  onClose,
  initialName,
  initialFlag,
}: EditProfileModalProps) {
  const { user, checkName, refreshUser } = useAuth();
  const [name, setName] = useState(initialName);
  const [flag, setFlag] = useState(initialFlag);
  const [teams, setTeams] = useState<Team[]>([]);
  const [nameStatus, setNameStatus] = useState<NameStatus>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Reset local state every time the modal opens so subsequent opens start fresh.
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(initialName);
      setFlag(initialFlag);
      setNameStatus(null);
      setError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initialName, initialFlag]);

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
        // Leave teams empty; the picker shows a "Loading…" fallback.
      }
    })();
    return () => {
      ctrl.cancelled = true;
    };
  }, [open, teams.length]);

  // Debounced name validation (skipped when the name is unchanged).
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = name.trim();

    /* eslint-disable react-hooks/set-state-in-effect */
    if (trimmed === initialName) {
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
  }, [name, initialName, checkName]);

  const nameUnchanged = name.trim() === initialName;
  const flagUnchanged = flag === initialFlag;
  const nameOk = nameUnchanged || nameStatus === 'available';
  const canSubmit = nameOk && !(nameUnchanged && flagUnchanged) && !submitting;

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

  async function handleSave() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const authedApi = getAuthedApi(user.address);
      if (!authedApi) throw new Error('Not authenticated');
      const res = await authedApi.user.rename.$post({
        json: { name: name.trim(), flag },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to update profile');
      }
      await refreshUser();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleSave();
            }}
            disabled={!canSubmit}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="label mb-2 block">Display Name</span>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            maxLength={50}
            placeholder="Your name"
          />
          <div
            className={cn('mt-1.5 min-h-[1rem] text-xs font-medium', statusToneClass)}
          >
            {statusText || ' '}
          </div>
        </label>

        <div>
          <span className="label mb-2 block">Team / Flag</span>
          <div className="no-scrollbar max-h-56 overflow-y-auto rounded-xl border border-border-subtle bg-bg-elevated p-2">
            {teams.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                Loading teams…
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {teams.map((team) => {
                  const active = flag === team.logo;
                  return (
                    <button
                      key={team.team_id}
                      type="button"
                      onClick={() => { setFlag(team.logo); }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors',
                        active
                          ? 'border-brand-500 bg-brand-500/10 text-text-primary'
                          : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong',
                      )}
                      title={team.team_name}
                    >
                      <img
                        src={'/assets/team-logos/' + team.logo}
                        alt={team.team_name}
                        loading="lazy"
                        className="h-6 w-9 rounded-sm object-cover"
                      />
                      <span className="w-full truncate text-center">{team.team_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-xs font-semibold text-accent-red">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
