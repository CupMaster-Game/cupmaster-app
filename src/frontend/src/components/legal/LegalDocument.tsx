import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type Block =
  | { type: 'p'; text: string }
  | { type: 'sub'; text: string }
  | { type: 'list'; items: readonly string[] };

interface Section {
  heading: string;
  blocks: readonly Block[];
}

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  intro: readonly string[];
  sections: readonly Section[];
}

export function LegalDocument({
  title,
  lastUpdated,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg-base">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-border-subtle bg-bg-base/90 px-4 py-3 backdrop-blur-md">
        <Link
          to="/"
          aria-label="Back"
          className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-base font-semibold">{title}</span>
      </header>

      <main className="flex-1 px-4 pb-8 pt-4">
        <div className="card p-5">
          <div className="label text-brand-400">CupMaster</div>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight">
            {title}
          </h1>
          <div className="mt-1 text-xs font-semibold text-text-muted">
            {lastUpdated}
          </div>

          <div className="mt-4 space-y-3">
            {intro.map((p, i) => (
              <p
                key={`intro-${String(i)}`}
                className="text-sm leading-relaxed text-text-secondary"
              >
                {p}
              </p>
            ))}
          </div>

          {sections.map((section, si) => (
            <section key={`s-${String(si)}`} className="mt-6">
              <h2 className="border-b border-accent-yellow/30 pb-2 text-sm font-bold uppercase tracking-wide text-text-primary">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.blocks.map((block, bi) => {
                  const key = `b-${String(si)}-${String(bi)}`;
                  if (block.type === 'sub') {
                    return (
                      <h3
                        key={key}
                        className="mt-3 text-sm font-bold text-brand-300"
                      >
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === 'list') {
                    return (
                      <ul
                        key={key}
                        className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-secondary"
                      >
                        {block.items.map((it, ii) => (
                          <li key={`li-${String(ii)}`}>{it}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p
                      key={key}
                      className="text-sm leading-relaxed text-text-secondary"
                    >
                      {block.text}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
