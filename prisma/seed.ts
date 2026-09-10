import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient, type Section, type TaskType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED as SEED_BASE } from "./seed-data";
import { SEED_EXTRA } from "./seed-data-extra";

const SEED = [...SEED_BASE, ...SEED_EXTRA];

const prisma = new PrismaClient();

// Section each task type belongs to (mirrors src/lib/pte/taskTypes.ts).
const TASK_SECTION: Record<TaskType, Section> = {
  READ_ALOUD: "SPEAKING", REPEAT_SENTENCE: "SPEAKING", DESCRIBE_IMAGE: "SPEAKING",
  RETELL_LECTURE: "SPEAKING", ANSWER_SHORT_QUESTION: "SPEAKING",
  SUMMARIZE_WRITTEN_TEXT: "WRITING", WRITE_ESSAY: "WRITING",
  RW_FILL_BLANKS: "READING", MCQ_SINGLE_R: "READING", MCQ_MULTI_R: "READING",
  REORDER_PARAGRAPHS: "READING", R_FILL_BLANKS: "READING",
  SUMMARIZE_SPOKEN_TEXT: "LISTENING", MCQ_MULTI_L: "LISTENING", L_FILL_BLANKS: "LISTENING",
  HIGHLIGHT_SUMMARY: "LISTENING", MCQ_SINGLE_L: "LISTENING", SELECT_MISSING_WORD: "LISTENING",
  HIGHLIGHT_INCORRECT_WORDS: "LISTENING", WRITE_FROM_DICTATION: "LISTENING",
};

const AUDIO_TASKS: TaskType[] = [
  "REPEAT_SENTENCE", "DESCRIBE_IMAGE", "RETELL_LECTURE", "ANSWER_SHORT_QUESTION",
  "SUMMARIZE_SPOKEN_TEXT", "MCQ_MULTI_L", "L_FILL_BLANKS", "HIGHLIGHT_SUMMARY",
  "MCQ_SINGLE_L", "SELECT_MISSING_WORD", "HIGHLIGHT_INCORRECT_WORDS", "WRITE_FROM_DICTATION",
];

// ── Sample chart images for Describe Image (no external assets needed) ──
function barChartSvg(title: string, bars: { label: string; value: number }[], color: string) {
  const w = 480, h = 300, pad = 40;
  const max = Math.max(...bars.map((b) => b.value));
  const bw = (w - pad * 2) / bars.length;
  const rects = bars
    .map((b, i) => {
      const bh = ((h - pad * 2) * b.value) / max;
      const x = pad + i * bw + bw * 0.15;
      const y = h - pad - bh;
      return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(bw * 0.7).toFixed(0)}" height="${bh.toFixed(0)}" fill="${color}" rx="4"/>
<text x="${(x + bw * 0.35).toFixed(0)}" y="${h - pad + 16}" font-size="12" text-anchor="middle" fill="#475569">${b.label}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="#ffffff"/>
<text x="${w / 2}" y="24" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">${title}</text>
<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#94a3b8"/>
<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#94a3b8"/>
${rects}
</svg>`;
}

const IMAGES: Record<number, string> = {
  1: barChartSvg("Energy sources (%)", [
    { label: "Solar", value: 40 }, { label: "Wind", value: 30 }, { label: "Hydro", value: 20 }, { label: "Coal", value: 10 },
  ], "#2563eb"),
  2: barChartSvg("Monthly website visitors (k)", [
    { label: "Jan", value: 12 }, { label: "Feb", value: 18 }, { label: "Mar", value: 22 }, { label: "Apr", value: 19 }, { label: "May", value: 28 }, { label: "Jun", value: 35 },
  ], "#0891b2"),
  3: barChartSvg("Household budget (%)", [
    { label: "Housing", value: 35 }, { label: "Food", value: 20 }, { label: "Transport", value: 15 }, { label: "Other", value: 20 }, { label: "Savings", value: 10 },
  ], "#7c3aed"),
  4: barChartSvg("Average rainfall (mm)", [
    { label: "Win", value: 90 }, { label: "Spr", value: 60 }, { label: "Sum", value: 25 }, { label: "Aut", value: 55 },
  ], "#059669"),
  5: barChartSvg("Sales by region (k)", [
    { label: "North", value: 48 }, { label: "East", value: 33 }, { label: "South", value: 40 }, { label: "West", value: 22 },
  ], "#ea580c"),
};

async function main() {
  console.log("Seeding PTE Practice sample content…");

  // Shared open guest (auth removed) + legacy demo admin email if present.
  await prisma.user.upsert({
    where: { email: "guest@ptepractice.local" },
    update: { role: "ADMIN", name: "Guest" },
    create: {
      email: "guest@ptepractice.local",
      name: "Guest",
      role: "ADMIN",
    },
  });

  const adminEmail = "admin@ptepractice.local";
  const adminPass = "Password123!";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Demo Admin",
      role: "ADMIN",
      hashedPassword: await bcrypt.hash(adminPass, 12),
      targetScore: 79,
    },
  });

  // 2) Chart images for Describe Image.
  const imgDir = path.join(process.cwd(), "public", "uploads", "seed");
  mkdirSync(imgDir, { recursive: true });
  for (const [n, svg] of Object.entries(IMAGES)) {
    writeFileSync(path.join(imgDir, `img${n}.svg`), svg, "utf8");
  }

  // 3) Reset sample content (idempotent) then insert.
  await prisma.mockTest.deleteMany({});
  await prisma.question.deleteMany({ where: { isSample: true } });

  const createdByType = new Map<TaskType, string[]>();

  for (const item of SEED) {
    const section = TASK_SECTION[item.taskType];
    const payload = { ...(item.payload as Record<string, unknown>) };
    let promptText: string | null = null;
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Reading MCQ: show the passage (move it out of payload to promptText).
    if ((item.taskType === "MCQ_SINGLE_R" || item.taskType === "MCQ_MULTI_R") && payload.passage) {
      promptText = String(payload.passage);
      delete payload.passage;
    }
    // Audio tasks: the spoken script becomes hidden promptText (used by seed:audio).
    if (AUDIO_TASKS.includes(item.taskType)) {
      mediaType = "audio";
      if (item.spoken) promptText = item.spoken;
    }
    // Describe Image: attach the generated chart.
    if (item.taskType === "DESCRIBE_IMAGE" && item.image) {
      mediaType = "image";
      mediaUrl = `/uploads/seed/img${item.image}.svg`;
    }

    const q = await prisma.question.create({
      data: {
        section,
        taskType: item.taskType,
        title: item.title,
        instructions: item.instructions ?? null,
        promptText,
        mediaUrl,
        mediaType,
        payload: payload as Prisma.InputJsonValue,
        difficulty: 2,
        isSample: true,
        tags: item.tags ?? [],
      },
      select: { id: true },
    });
    const list = createdByType.get(item.taskType) ?? [];
    list.push(q.id);
    createdByType.set(item.taskType, list);
  }

  const totalQ = [...createdByType.values()].reduce((s, l) => s + l.length, 0);
  console.log(`Inserted ${totalQ} sample questions across ${createdByType.size} task types.`);

  // 4) Mock tests — one per section + one full mock.
  const sectionsList: Section[] = ["SPEAKING", "WRITING", "READING", "LISTENING"];
  const sectionLabel: Record<Section, string> = {
    SPEAKING: "Speaking", WRITING: "Writing", READING: "Reading", LISTENING: "Listening",
  };

  function questionsForSection(section: Section, perType: number): string[] {
    const ids: string[] = [];
    for (const [tt, list] of createdByType) {
      if (TASK_SECTION[tt] === section) ids.push(...list.slice(0, perType));
    }
    return ids;
  }

  for (const section of sectionsList) {
    const ids = questionsForSection(section, 1);
    if (ids.length === 0) continue;
    await prisma.mockTest.create({
      data: {
        title: `${sectionLabel[section]} Mock Test`,
        description: `A timed ${sectionLabel[section]} section mock covering each task type once.`,
        type: "SECTION",
        section,
        isSample: true,
        questions: { create: ids.map((questionId, order) => ({ questionId, order })) },
      },
    });
  }

  // Full mock: one question from each task type.
  const fullIds: string[] = [];
  for (const list of createdByType.values()) if (list[0]) fullIds.push(list[0]);
  await prisma.mockTest.create({
    data: {
      title: "Full PTE Mock Test",
      description: "A full-length style-alike mock spanning all four skills and every task type.",
      type: "FULL",
      isSample: true,
      questions: { create: fullIds.map((questionId, order) => ({ questionId, order })) },
    },
  });

  console.log("Created 4 section mocks + 1 full mock.");
  console.log(`\nDemo admin login:  ${adminEmail}  /  ${adminPass}`);
  console.log("Done. Run `npm run seed:audio` (with OPENAI_API_KEY set) to generate audio for listening/speaking tasks.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
