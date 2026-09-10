import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingInstrument } from "@/components/landing-instrument";

/**
 * Landing page. The hero is the scoring instrument itself rather than a
 * headline block — the product's whole proposition is "know your number", so
 * showing the number being taken is a stronger opening than describing it.
 */

const SECTIONS = [
  {
    name: "Speaking",
    count: 5,
    tasks: "RA · RS · DI · RL · ASQ",
    detail: "Recorded, transcribed, then scored for content, oral fluency and pronunciation.",
  },
  {
    name: "Writing",
    count: 2,
    tasks: "SWT · Write Essay",
    detail: "Scored on content, form, grammar, vocabulary, spelling and linguistic range.",
  },
  {
    name: "Reading",
    count: 5,
    tasks: "RWFIB · MCQ · Re-order · RFIB",
    detail: "Graded in code against the answer key, so results are instant and consistent.",
  },
  {
    name: "Listening",
    count: 8,
    tasks: "SST · Dictation · HIW · Missing word",
    detail: "Audio prompts with the same rubric treatment as the rest of the exam.",
  },
];

const PIPELINE = [
  {
    step: "01",
    title: "You answer under exam timing",
    body: "Each task type carries its real time limit. Speaking tasks record from your microphone; the rest are typed or clicked.",
  },
  {
    step: "02",
    title: "Claude scores it against that task's rubric",
    body: "Not right-or-wrong. Every open-ended response is marked criterion by criterion, the way an examiner would work through it.",
  },
  {
    step: "03",
    title: "You get the number and the reason",
    body: "A 10–90 band, the sub-scores behind it, and feedback that quotes what you actually wrote or said.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:py-5">
        <Link href="/" className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-lg font-bold tracking-tight">PTE Practice</span>
          <span className="eyebrow hidden sm:inline">10–90</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="sm:h-10 sm:px-4">
              Dashboard
            </Button>
          </Link>
          <Link href="/practice">
            <Button size="sm" className="sm:h-10 sm:px-4">
              Practise
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:gap-12 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="eyebrow">PTE Academic practice</p>
            <h1 className="mt-3 text-[2rem] font-bold leading-[1.08] tracking-tight sm:mt-4 sm:text-5xl lg:text-6xl">
              Most people need a 79.
              <br />
              <span className="text-muted-foreground">Where are you actually?</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              Practise all 20 PTE-style task types and get every response marked against
              the criteria the exam actually uses — content, fluency, grammar, form —
              with the reasoning shown. No account needed.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link href="/practice" className="sm:contents">
                <Button size="lg" className="h-12 w-full sm:w-auto">
                  Start practising
                </Button>
              </Link>
              <Link href="/dashboard" className="sm:contents">
                <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto">
                  Open dashboard
                </Button>
              </Link>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground sm:mt-5">
              180 practice questions · 20 task types · free to use
            </p>
          </div>

          <LandingInstrument />
        </section>

        <section className="border-t bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 lg:py-20">
            <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
              Every task type, not a sampler
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              The exam tests four skills across twenty task types. All twenty are here.
            </p>

            <ul className="mt-8 divide-y border-y sm:mt-10">
              {SECTIONS.map((s) => (
                <li
                  key={s.name}
                  className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-8 sm:py-6"
                >
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-display text-lg font-semibold sm:text-xl">{s.name}</h3>
                    <span className="font-mono tabular text-sm text-muted-foreground">
                      {s.count}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-xs leading-relaxed text-readout sm:text-sm sm:font-sans sm:text-foreground">
                      {s.tasks}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14 lg:py-20">
          <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
            What happens when you submit
          </h2>
          <ol className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-3">
            {PIPELINE.map((p) => (
              <li key={p.step}>
                <span className="font-mono text-sm font-medium text-readout">{p.step}</span>
                <div className="tick-rule my-3" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-lg border bg-card p-5 sm:mt-14 sm:p-8">
            <h3 className="font-display text-lg font-semibold sm:text-xl">
              Ready when you are
            </h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Jump straight into a skill — Speaking, Writing, Reading, or Listening —
              and start marking attempts against the exam rubrics.
            </p>
            <Link href="/practice" className="mt-5 block sm:inline-block">
              <Button size="lg" className="h-12 w-full sm:w-auto">
                Go to practise
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-xs leading-relaxed text-muted-foreground">
          Original style-alike practice material for study purposes only. Not affiliated
          with, endorsed by, or connected to Pearson. PTE is a trademark of its respective
          owner.
        </div>
      </footer>
    </div>
  );
}
