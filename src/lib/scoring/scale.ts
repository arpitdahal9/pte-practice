import { clamp } from "@/lib/utils";

/** Map a 0..1 fraction to the 0–90 PTE scale. */
export function toPteScore(fraction: number): number {
  return Math.round(clamp(fraction, 0, 1) * 90);
}

/** Normalize a word for comparison (lowercase, strip punctuation). */
export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, "")
    .trim();
}

/** Split text into normalized, non-empty word tokens. */
export function words(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);
}
