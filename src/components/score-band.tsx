import { cn } from "@/lib/utils";

/**
 * The band rule — this app's signature element.
 *
 * PTE reports on a 10–90 scale, so every score in the product is drawn on that
 * same calibrated axis: ticks every 10, a fill to the score, an amber notch for
 * the learner's target. Because each skill uses an identical axis, stacking
 * four of them makes the comparison immediate in a way four separate stat
 * cards never could — the reader is looking at one instrument, not four.
 */

export const BAND_MIN = 10;
export const BAND_MAX = 90;

/** Where a score sits along the rule, as a 0–100 percentage. */
export function bandPercent(score: number): number {
  const clamped = Math.min(Math.max(score, BAND_MIN), BAND_MAX);
  return ((clamped - BAND_MIN) / (BAND_MAX - BAND_MIN)) * 100;
}

interface ScoreBandProps {
  score: number | null;
  /** Draws an amber notch at the learner's goal. */
  target?: number | null;
  size?: "sm" | "md" | "lg";
  /** Show the 10 … 90 axis labels beneath the rule. */
  showScale?: boolean;
  label?: string;
  className?: string;
}

const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

const TRACK_HEIGHT = { sm: "h-1.5", md: "h-2.5", lg: "h-4" } as const;
const SCORE_SIZE = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-4xl sm:text-6xl",
} as const;

export function ScoreBand({
  score,
  target,
  size = "md",
  showScale = false,
  label,
  className,
}: ScoreBandProps) {
  const hasScore = score != null;
  const pct = hasScore ? bandPercent(score) : 0;

  return (
    <div className={cn("w-full", className)}>
      {(label || hasScore) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="eyebrow">{label}</span>}
          <span
            className={cn(
              "font-mono tabular font-semibold leading-none",
              SCORE_SIZE[size],
              hasScore ? "text-readout" : "text-muted-foreground",
            )}
          >
            {hasScore ? Math.round(score) : "––"}
          </span>
        </div>
      )}

      <div className="relative">
        {/* Track */}
        <div
          className={cn("w-full overflow-hidden rounded-sm bg-band-track", TRACK_HEIGHT[size])}
          role="img"
          aria-label={
            hasScore
              ? `${label ? `${label}: ` : ""}${Math.round(score)} out of 90${
                  target ? `, target ${target}` : ""
                }`
              : `${label ? `${label}: ` : ""}not yet scored`
          }
        >
          <div
            className="h-full rounded-sm bg-band-fill transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Calibration ticks sit on top of the track. */}
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          {TICKS.map((t) => (
            <span
              key={t}
              className="w-px bg-background/70"
              // The end ticks would clip against the rounded track edge.
              style={{ opacity: t === BAND_MIN || t === BAND_MAX ? 0 : 1 }}
            />
          ))}
        </div>

        {/* Target notch — the only other place amber is allowed. */}
        {target != null && (
          <div
            className="pointer-events-none absolute -top-1 -bottom-1 w-0.5 bg-readout"
            style={{ left: `${bandPercent(target)}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      {showScale && (
        <div className="mt-1 flex justify-between font-mono text-[0.625rem] tabular text-muted-foreground">
          {TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
