export type Segment =
  | { type: "text"; value: string }
  | { type: "blank"; id: string };

/**
 * Parse a gap-fill template into ordered segments. Gaps are `{{blankId}}`.
 * e.g. "The {{b1}} sat on the {{b2}}." → [text, blank(b1), text, blank(b2), text]
 */
export function parseBlanks(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\{\{\s*([\w-]+)\s*\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", value: text.slice(last, m.index) });
    }
    segments.push({ type: "blank", id: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}
