import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, TaskType } from "@prisma/client";
import { generateQuestions, type GeneratedItem } from "../src/lib/content/generation";

/**
 * Generate style-alike practice questions with Claude and write them to a JSON
 * file for review. Nothing touches the database here — review the output, then
 * apply it with `npm run content:import -- <file>`.
 *
 * Usage:
 *   npm run content:generate -- --type WRITE_ESSAY --count 10
 *   npm run content:generate -- --all --count 5
 *   npm run content:generate -- --type MCQ_SINGLE_R --count 8 --topic "marine biology"
 *
 * Requires Anthropic credentials: either ANTHROPIC_API_KEY in .env, or an
 * OAuth profile from `ant auth login`.
 */

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const count = Number(arg("count") ?? 5);
  const topic = arg("topic");
  const outArg = arg("out");

  const typeArg = arg("type");
  let types: TaskType[];
  if (has("all")) {
    types = Object.values(TaskType);
  } else if (typeArg) {
    types = typeArg.split(",").map((t) => t.trim()) as TaskType[];
    const bad = types.filter((t) => !Object.values(TaskType).includes(t));
    if (bad.length) {
      console.error(`Unknown task type(s): ${bad.join(", ")}`);
      console.error(`Valid values: ${Object.values(TaskType).join(", ")}`);
      process.exit(1);
    }
  } else {
    console.error("Specify --type <TASK_TYPE[,TASK_TYPE]> or --all. See --help in the README.");
    process.exit(1);
  }

  const all: GeneratedItem[] = [];
  const allRejected: { title: string; reason: string }[] = [];

  for (const taskType of types) {
    // Feed existing titles back in so repeated runs diverge instead of
    // regenerating the same handful of topics.
    const existing = await prisma.question.findMany({
      where: { taskType },
      select: { title: true },
      take: 200,
    });

    process.stdout.write(`${taskType}: generating ${count}… `);
    try {
      const { items, rejected } = await generateQuestions(taskType, count, {
        topic,
        avoidTitles: existing.map((e) => e.title),
      });
      all.push(...items);
      allRejected.push(...rejected);
      console.log(`${items.length} ok${rejected.length ? `, ${rejected.length} rejected` : ""}`);
    } catch (err) {
      console.log("FAILED");
      console.error(`  ${(err as Error).message}`);
    }
  }

  if (allRejected.length) {
    console.log(`\nRejected ${allRejected.length} item(s) that failed validation:`);
    for (const r of allRejected) console.log(`  - ${r.title}: ${r.reason}`);
  }

  if (!all.length) {
    console.error("\nNothing generated.");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "content", "generated");
  mkdirSync(outDir, { recursive: true });
  const file =
    outArg ?? path.join(outDir, `questions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify({ items: all }, null, 2));

  console.log(`\nWrote ${all.length} item(s) to ${file}`);
  console.log("Review it, then apply with:");
  console.log(`  npm run content:import -- ${path.relative(process.cwd(), file)} --dry-run`);
  console.log(`  npm run content:import -- ${path.relative(process.cwd(), file)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
