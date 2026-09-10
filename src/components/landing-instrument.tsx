"use client";

import { useEffect, useState } from "react";
import { ScoreBand } from "@/components/score-band";

/**
 * The landing hero. Rather than describing the product, it *is* the product's
 * central instrument: a 10–90 band sweeping up to a reading, with the four
 * skills resolving beneath it on the same axis. The sweep runs once on mount;
 * prefers-reduced-motion collapses it to the final state via the global rule.
 */

const SKILLS = [
  { label: "Speaking", score: 71 },
  { label: "Writing", score: 66 },
  { label: "Reading", score: 78 },
  { label: "Listening", score: 62 },
];

const TARGET = 79;

export function LandingInstrument() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const overall = 69;

  return (
    <figure className="rounded-lg border bg-card p-5 shadow-sm sm:p-8">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">Predicted overall</span>
        <span className="eyebrow">Target {TARGET}</span>
      </figcaption>

      <div className="mt-4">
        <ScoreBand
          score={live ? overall : 10}
          target={TARGET}
          size="lg"
          showScale
        />
      </div>

      <div className="tick-rule my-7" aria-hidden="true" />

      <div className="space-y-4">
        {SKILLS.map((s, i) => (
          <div
            key={s.label}
            style={{ transitionDelay: `${120 + i * 90}ms` }}
            className="transition-opacity duration-500"
          >
            <ScoreBand
              label={s.label}
              score={live ? s.score : 10}
              size="sm"
            />
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Sample reading. Your own bands fill in as you practise.
      </p>
    </figure>
  );
}
