import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/ui/Flag';
import { cn } from '@/lib/cn';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialCountryCode: string;
  onSave: (patch: { name: string; countryCode: string }) => void;
}

const COUNTRIES: readonly (readonly [string, string])[] = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['BR', 'Brazil'],
  ['AR', 'Argentina'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['PT', 'Portugal'],
  ['NL', 'Netherlands'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['CA', 'Canada'],
  ['MX', 'Mexico'],
  ['AU', 'Australia'],
  ['TR', 'Türkiye'],
];

export function EditProfileModal({
  open,
  onClose,
  initialName,
  initialCountryCode,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [country, setCountry] = useState(initialCountryCode);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({ name: name.trim() || initialName, countryCode: country });
              onClose();
            }}
          >
            Save
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
            maxLength={24}
            placeholder="Your name"
          />
        </label>

        <div>
          <span className="label mb-2 block">Country / Flag</span>
          <div className="grid grid-cols-4 gap-2">
            {COUNTRIES.map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => { setCountry(code); }}
                title={label}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl border bg-bg-elevated text-2xl transition-all',
                  country === code
                    ? 'border-brand-500 shadow-glow-soft'
                    : 'border-border-default hover:border-border-strong',
                )}
              >
                <Flag code={code} size="lg" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
