import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { SECTIONS, SECTION_LABELS, taskTypesForSection } from "@/lib/pte/taskTypes";

export const metadata = { title: "Practise — PTE Practice" };

/**
 * Task-type index. Section chips jump the page; each row is a large tap target
 * with the PTE abbreviation so students can scan the way they already talk
 * about the exam (RA, SWT, WFD…).
 */
export default async function PracticeHub() {
  const counts = await prisma.question.groupBy({
    by: ["taskType"],
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.taskType, c._count._all]));

  return (
    <div className="space-y-8 sm:space-y-12">
      <div>
        <p className="eyebrow">Practise</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Choose a task type
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          All twenty PTE-style task types. Tap a skill below, then pick a task —
          each attempt is marked against that task&apos;s own rubric.
        </p>
      </div>

      <nav
        aria-label="Jump to skill"
        className="sticky top-14 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
      >
        <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((section) => (
            <li key={section} className="shrink-0">
              <a
                href={`#${section.toLowerCase()}`}
                className="inline-flex h-10 items-center rounded-md border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {SECTION_LABELS[section]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SECTIONS.map((section) => (
        <section key={section} id={section.toLowerCase()} className="scroll-mt-32 md:scroll-mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">{SECTION_LABELS[section]}</h2>
            <span className="eyebrow">{taskTypesForSection(section).length} tasks</span>
          </div>
          <div className="tick-rule mt-3" aria-hidden="true" />

          <ul className="divide-y">
            {taskTypesForSection(section).map((t) => {
              const count = countMap.get(t.type) ?? 0;
              const empty = count === 0;

              const body = (
                <div className="flex items-start gap-3 py-4 sm:grid sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-x-6 sm:gap-y-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs font-medium text-readout">
                        {t.shortLabel}
                      </span>
                      <span className="font-display text-base font-semibold sm:text-lg">
                        {t.label}
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {empty ? "No questions in the bank yet." : t.blurb}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:pt-0">
                    <span
                      className={
                        empty
                          ? "font-mono tabular text-sm text-muted-foreground"
                          : "font-mono tabular text-sm text-readout"
                      }
                    >
                      {empty ? "—" : count}
                    </span>
                    {!empty && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground sm:hidden" />
                    )}
                  </div>
                </div>
              );

              return (
                <li key={t.type}>
                  {empty ? (
                    <div className="opacity-55">{body}</div>
                  ) : (
                    <Link
                      href={`/practice/${t.type}`}
                      className="-mx-2 block rounded-md px-2 transition-colors hover:bg-accent/50 active:bg-accent"
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
