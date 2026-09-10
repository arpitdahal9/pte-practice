# Decisions log

Assumptions and judgement calls made while building, so they can be revisited.

---

## 2026-08-05 — Failed AI scoring throws instead of falling back

**Decision:** `scoreResponse()` throws `ScoringUnavailableError` when Claude
scoring fails. The heuristic scorer runs only when `SCORING_MOCK=true` is set
explicitly.

**Why:** The previous behaviour caught every scoring error and returned a
length/lexical-variety heuristic instead. Because `ANTHROPIC_API_KEY` was never
set, *every* open-ended response took that path — which is why scores looked
repetitive and feedback was generic. A plausible-looking wrong score is worse
than a visible error here: the learner can't tell the difference, and calibrates
their exam preparation against a number that means nothing.

**Consequence:** The attempt is still persisted (losing someone's essay would be
the worse failure), with a `Score` row at `status = FAILED` carrying the error.
The UI shows an error state with a "Retry scoring" action. `getUserStats()`
filters on `status = SCORED` so a failed attempt never enters averages or
trends.

## 2026-08-05 — Anthropic credentials are never probed, only attempted

**Decision:** Removed `hasAnthropic()`. There is no "is AI configured?" check.

**Why:** The SDK resolves credentials from several sources in priority order
(`ANTHROPIC_API_KEY` → `ANTHROPIC_AUTH_TOKEN` → an `ant auth login` OAuth
profile on disk → workload identity federation). An unset `ANTHROPIC_API_KEY`
does **not** mean "no credentials", so gating on it was wrong the moment we
supported OAuth profiles. We attempt the call and report real auth failures.

**Consequence:** `.env` must leave `ANTHROPIC_API_KEY` **commented out** rather
than set to `""`. An empty string still occupies the highest-priority credential
slot and authenticates with an empty key, shadowing the profile.

## 2026-08-05 — Model is `claude-opus-5`, effort `medium`, structured outputs

**Decision:** Default scoring model `claude-opus-5`; `output_config.effort`
defaults to `medium` (override via `ANTHROPIC_EFFORT`); replies constrained with
`output_config.format` (JSON schema) instead of regex-extracting JSON from prose.

**Why:** Structured outputs remove a whole class of parse failures and let the
rubric's criteria keys define the schema, so the model cannot invent or omit a
criterion. `medium` balances cost/latency against consistency for what is
essentially a bounded grading task; scoring runs synchronously while the user
waits. `max_tokens` was also raised from 1024 to 4096: thinking is on by default
on current models and its tokens count against `max_tokens`, so the old budget
risked truncating the JSON body mid-object.

**Consequence:** Retries are now selective — only 408/429/5xx and connection
errors are retried. A 401/403 fails immediately with an actionable message
instead of burning three attempts on a credential that cannot work.

## 2026-08-05 — Question selection is user-aware with widening tiers

**Decision:** `selectCandidateIds()` picks from the first non-empty tier of:
(1) never attempted and not served this session, (2) not served this session,
(3) the whole pool.

**Why:** The old `getRandomClientQuestion()` picked a random row per request
with no memory, so on a 5-question pool a repeat was common and an immediate
repeat of the question just answered was possible. Tier 2 is the important one:
it keeps the session moving once a user has attempted everything, instead of
collapsing to an unfiltered random pick.

**Consequence:** The practice page and `/api/questions/next` require an
authenticated user, since selection depends on attempt history. The client sends
the ids served so far this session and resets that list once the pool cycles.
`?random=1` on `/api/questions` is retained for admin/browse use only.

## 2026-08-05 — STT provider stays OpenAI Whisper

**Decision:** Keep the existing Whisper driver rather than switching to
Deepgram. Requires `OPENAI_API_KEY`.

**Why:** Confirmed with the project owner. The driver is already written against
the storage/STT interface, so this is the lowest-risk path. Deepgram's
word-level timings would improve fluency scoring and remain a sensible future
change behind the same interface.

## 2026-08-05 — Design language is built on the 10–90 band

**Decision:** Replaced the stock shadcn palette and Geist type with
"Calibration": graphite paper, petrol actions, and a single amber readout used
only for score numerals and target markers. IBM Plex Condensed / Sans / Mono.
The signature component is `ScoreBand`, a 10–90 rule with ticks and a target
notch.

**Why:** PTE reports on a 10–90 scale and the product exists to answer "where am
I on it?". Four separate stat cards — the default dashboard answer — put each
skill on its own implicit scale and hide the comparison that matters. Stacking
all four on one shared axis makes it immediate.

**Consequence:** Amber is reserved. Anything else tinted amber weakens the
signal that a number is a reading. Two bugs surfaced while rebuilding the score
card: breakdown bars were drawn as `value * 20` (so 3/3 and 3/5 looked
identical, now normalised via `criterionMaxes()`), and the review page rendered
a FAILED score's placeholder 0 as a real band.

## 2026-08-05 — Seed expansion covers short-form types only

**Decision:** Eight short-form task types go to 15 questions each (180 total);
the twelve passage-heavy types stay at 5.

**Why:** Each passage-heavy item needs a 120–180 word original passage plus a
consistent answer key. Hand-authoring ~120 of those is exactly the work the
generator was built to do, and generated passages are reviewable before import.

**Consequence:** Reading and the listening MCQs will still repeat within a long
session until `npm run content:generate` has been run against them. Flagged in
the README under "Known gaps".
