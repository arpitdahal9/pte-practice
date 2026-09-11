import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number to a range. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Format seconds as m:ss. */
export function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/** Split text into word tokens preserving order (for highlight tasks). */
export function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Coerce Prisma Json (ex-String[]) fields to string[]. */
export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}
