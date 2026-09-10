# PTE Practice

A practice platform for the PTE Academic exam. Covers all 20 task types across
Speaking, Writing, Reading and Listening, scores each response against that task's
rubric, and tracks progress on the 10-90 band.

Note on content: every question in this repo is original sample material written or
generated for the project. It is not official exam content, and the project has no
affiliation with Pearson.

Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, Prisma + PostgreSQL,
Anthropic Claude for scoring, OpenAI Whisper for speech-to-text.

## Status

Working:

- Open access — no login or account required (shared local guest user under the hood)
- All 20 task types with working players (audio recording, MCQ, drag-fill, dropdown,
  re-order, highlight, dictation)
- Objective tasks scored in code with partial credit; open-ended tasks scored by Claude
  against a per-task rubric, returning a band, a per-criterion breakdown and written
  feedback
- Speaking tasks: recorded, transcribed with Whisper, then scored from the transcript
  plus audio metrics
- 180 seeded questions, plus a generator and importer for adding more
- Dashboard with predicted overall, four skills on a shared band, trend over time and
  weakest task types
- Individual practice, timed section and full mock tests, full attempt history
- Admin question CRUD and bulk JSON import (open — no admin gate)
- Local disk storage in dev, S3-compatible in prod

Not done yet:

- The question bank is uneven. Eight short-form task types have 15 questions each; the
  twelve passage-heavy types still have 5. The generator exists to fill those in.
- Describe Image reuses five generated sample charts. New items need new chart SVGs.
- Phase 2 items are unstarted: custom mock builder, PTE Core variant, bookmarking,
  guided study plan, mobile app.

## Setup

You need Node 20+, and Docker for the local Postgres (or any Postgres connection
string). Scoring needs Anthropic credentials; speaking tasks additionally need an
OpenAI key.

```bash
git clone https://github.com/pushparajadhikari/PTE-Practice-for-Free.git
cd PTE-Practice-for-Free
npm install

cp .env.example .env          # then edit it, see Credentials below
docker compose up -d          # Postgres on :5433

npm run db:push               # create the schema
npm run db:seed               # 180 sample questions and 5 mock tests
npm run dev                   # http://localhost:3000 — open /practice with no login
```

Audio-prompt questions ship with a spoken script but no recording. With `OPENAI_API_KEY`
set, generate them:

```bash
npm run seed:audio            # idempotent, only fills what is missing
```

Until you run that, listening tasks show their prompt but have no playable audio.

## Credentials

### Anthropic

The SDK resolves credentials in priority order: `ANTHROPIC_API_KEY`, then
`ANTHROPIC_AUTH_TOKEN`, then an OAuth profile on disk, then workload identity
federation. Either of the first two approaches works.

For local development, an OAuth profile is easiest:

```bash
# macOS
brew install anthropics/tap/ant
xattr -d com.apple.quarantine "$(brew --prefix)/bin/ant"

# or, with Go 1.22+
go install github.com/anthropics/anthropic-cli/cmd/ant@latest

ant auth login
ant auth status               # shows which credential is active
```

Leave `ANTHROPIC_API_KEY` commented out in `.env` if you do this.

Important: `ANTHROPIC_API_KEY=""` is not the same as leaving it unset. An empty string
still occupies the highest-priority credential slot and authenticates with an empty key,
which shadows the profile. Comment the line out.

For a static key instead, get one from https://console.anthropic.com/ and set
`ANTHROPIC_API_KEY`. This is required for serverless deploys, which have no profile on
disk.

Either way, verify with a real submission rather than trusting the config: write an essay
at `/practice/WRITE_ESSAY` and check that the feedback refers to what you actually wrote.

### OpenAI

`OPENAI_API_KEY` powers Whisper transcription and the TTS behind `npm run seed:audio`.
Without it, speaking tasks record and save but cannot be transcribed, so they cannot be
scored.

### Offline mode

`SCORING_MOCK="true"` makes scoring return a labelled length-and-variety heuristic
without calling any external API. It is for offline development and CI. It is never
enabled automatically, and it is labelled everywhere it appears in the UI.

## How scoring works

`scoreResponse(taskType, userResponse, referenceData)` in `src/lib/scoring/` routes to
one of two scorers.

Objective tasks (MCQ, re-order, gap-fill, dictation, highlight) are scored in code in
`scoring/deterministic.ts` against the answer key, with partial credit. Deterministic,
instant, free.

Open-ended tasks (essays, summaries, all speaking) go to Claude in `scoring/ai.ts` using
that task's rubric from `scoring/rubrics.ts`. Each rubric declares its criteria and their
maxima. Write Essay, for example, is marked on content (0-3), development (0-2), form
(0-2), grammar (0-2), vocabulary (0-2), linguistic range (0-2) and spelling (0-2). Those
criteria generate a JSON schema and the reply is constrained with structured outputs, so
the model cannot invent or omit a criterion. Raw points are clamped to each criterion's
maximum, summed, and mapped onto the 10-90 band.

The band, the per-criterion breakdown, the feedback text and the model's raw JSON are all
stored against the attempt.

### When scoring fails

It fails loudly. `scoreResponse` throws, and the app:

1. still saves the attempt, since losing an essay is the worse failure;
2. writes a `Score` row with `status = FAILED` carrying the error;
3. shows an error state with a retry, which calls `POST /api/attempts/:id/rescore`;
4. leaves it out of every average and trend, because `getUserStats()` filters on
   `status = SCORED`.

It never substitutes a heuristic for a real grade. A plausible-looking wrong score is
worse than a visible error here, because a learner cannot tell the difference and would
calibrate their preparation against a number that means nothing. That was the original
bug; see DECISIONS.md.

## Growing the question bank

Three ways in, all sharing one validated import path in `src/lib/content/import.ts`.

### Generate with Claude

```bash
npm run content:generate -- --type MCQ_SINGLE_R --count 10
npm run content:generate -- --type REORDER_PARAGRAPHS --count 8 --topic "marine biology"
npm run content:generate -- --all --count 5
```

This writes a JSON file to `content/generated/` and does not touch the database.
Existing titles are passed back to the model so repeat runs diverge instead of
regenerating the same topics.

Each item is validated before it reaches the file, not only against the payload schema
but against the structural rules a schema cannot express: `{{token}}`s must match
declared blanks, dropdown options must contain their own answer, `correctOptionId` must
be one of the options, `correctOrder` must be a permutation of the item ids, and
highlight indices must be in range. Items that fail are reported and dropped rather than
failing the batch.

Review the file, then apply it:

```bash
npm run content:import -- content/generated/questions-2026-08-06-12-00-00.json --dry-run
npm run content:import -- content/generated/questions-2026-08-06-12-00-00.json
npm run seed:audio        # if the batch included audio-prompt tasks
```

### Import your own JSON

Same importer, same validation:

```json
{
  "items": [
    {
      "taskType": "WRITE_ESSAY",
      "title": "Essay - Urban density",
      "payload": { "prompt": "Some argue that..." },
      "tags": ["custom"],
      "difficulty": 2
    }
  ]
}
```

Audio-prompt task types also need `spoken`, the script that `npm run seed:audio` turns
into a recording. Imports deduplicate on title, so re-running a file is safe.

### Admin UI

`POST /api/admin/questions/import` takes the same payload with `dryRun` and
`allowDuplicateTitles` flags and returns per-item skip reasons. Single-question CRUD is
at `/admin`.

## Layout

```
src/
  app/
    (app)/             dashboard, practice, mock, history, profile, admin
    api/               attempts, questions, questions/next, transcribe, admin/*
  components/
    score-band.tsx     the 10-90 rule used everywhere a score appears
    players/           one player per response kind
    practice/          runner, question stage, timer, score card
  lib/
    guest.ts           shared open user (auth removed)
    scoring/           rubrics, AI scorer, deterministic scorer, Claude client
    content/           question generation and validated bulk import
    pte/               task-type registry, payload/response schemas, blank parsing
    stats.ts           dashboard aggregation
    queries.ts         question selection
prisma/
  schema.prisma        User, Question, Attempt, Score, MockTest, MockAttempt
  seed-data.ts         original 100 sample questions
  seed-data-extra.ts   80 more, bringing short-form types to 15 each
scripts/
  generate-questions.ts   npm run content:generate
  import-questions.ts     npm run content:import
  generate-audio.ts       npm run seed:audio
```

### Question selection

`selectCandidateIds()` picks from the first non-empty tier of:

1. never attempted by this user and not served this session
2. not served this session
3. the whole pool

The client tracks the ids served so far and sends them to `/api/questions/next`,
resetting once the pool cycles. Tier 2 matters most: it keeps a session moving after a
user has attempted everything, instead of collapsing to an unfiltered random pick that
could re-serve the question just answered.

### Adding a task type

1. Add the value to the `TaskType` enum in `prisma/schema.prisma`, then `npm run db:push`.
2. Register it in `src/lib/pte/taskTypes.ts` with its section, label, blurb,
   `responseKind` and default time.
3. Add payload and response schemas in `src/lib/pte/schemas.ts` and wire them into
   `payloadSchemaFor` and `responseSchemaFor`.
4. Either add it to the deterministic list in `src/lib/scoring/deterministic.ts` or write
   a rubric in `src/lib/scoring/rubrics.ts`.
5. Reuse an existing player via `responseKind`, or add one and map it in
   `src/components/players/player-renderer.tsx`.
6. Add a generation spec to `GEN_SPECS` in `src/lib/content/generation.ts`.
7. Hide any answer-bearing fields in `clientPayload()` in `src/lib/questions.ts`.

Step 7 is not optional. `clientPayload()` strips the answer key from every question
before it is serialised to the browser, and scoring happens server-side only.

## Tests

```bash
npm test
npm run typecheck
npm run lint
```

Coverage focuses on things that fail silently:

- Scoring: failure propagates instead of becoming a mock, different-quality responses
  produce different scores, out-of-range criteria clamp to their rubric maximum.
- Question selection: a full walk of the pool serves each question exactly once, and
  nothing already served this session is re-served while alternatives remain.
- Seed data: all 180 items validate against the runtime schemas, answer keys reference
  options that exist, gap tokens match declared blanks, and every highlight-incorrect-words
  index both exists and genuinely differs from the spoken text.
- Generation: the structural validators reject the malformed items a model actually
  produces.

Tests run with `SCORING_MOCK=true` and make no network calls.

`npm run lint` currently reports 5 pre-existing errors from the React compiler rules
(`Date.now()` in `useRef` initialisers, `setState` in effects). They predate the current
work and are not fixed here.

## Deployment

Frontend on Vercel: import the repo and set every variable from `.env.example` in the
project settings. `ANTHROPIC_API_KEY` must be a real key, since serverless functions have
no OAuth profile on disk.

Database: any Postgres (Supabase, Neon, Railway). Set `DATABASE_URL` and run
`npm run db:migrate` against it.

Storage: set `STORAGE_DRIVER="s3"` and the `S3_*` variables. Local disk is dev-only and
will not survive a serverless deploy.

To run everything locally instead, `docker compose up -d` covers Postgres and the rest
runs under `npm run dev`.

## Design

The interface is built around the 10-90 band, on the argument that what the product
really has to tell someone is where they sit on that scale and how far it is to their
target. The palette is a cool graphite paper with deep petrol for actions and a single
amber tone reserved for score numerals and target markers. Type is IBM Plex: Condensed
for headings, Sans for body, Mono for numerals.

`ScoreBand` is the component that carries this. The dashboard stacks all four skills on
the same axis so they can be compared directly rather than read off four separate cards.

## Licence

Practice content in `prisma/seed-data*.ts` and anything produced by
`npm run content:generate` is original material for study purposes. PTE is a trademark of
its respective owner; this project claims no affiliation.
