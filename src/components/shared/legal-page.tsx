import Link from 'next/link';

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ReadonlyArray<{
    heading: string;
    body?: ReadonlyArray<string>;
    items?: ReadonlyArray<string>;
  }>;
};

export function LegalPage({ eyebrow, title, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_32%),linear-gradient(180deg,_#fffaf5_0%,_#ffffff_38%,_#fff7ed_100%)] px-4 py-10 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.14),_transparent_28%),linear-gradient(180deg,_#0f172a_0%,_#111827_42%,_#1f2937_100%)] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-orange-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-700 backdrop-blur transition hover:border-orange-300 hover:bg-orange-50 dark:border-orange-400/20 dark:bg-slate-900/70 dark:text-orange-300 dark:hover:bg-slate-800"
          >
            العودة للرئيسية
          </Link>
          <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            Effective date: May 6, 2026
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/88 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-slate-900/82">
          <div className="border-b border-slate-200/70 px-6 py-8 dark:border-slate-800 sm:px-10 sm:py-10">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-300">
              {eyebrow}
            </p>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              {intro}
            </p>
          </div>

          <div className="grid gap-5 px-6 py-8 sm:px-10 sm:py-10">
            {sections.map((section) => (
              <article
                key={section.heading}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/75 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/45"
              >
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {section.heading}
                </h2>

                {section.body?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.items ? (
                  <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
                    {section.items.map((item, index) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
