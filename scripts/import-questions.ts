import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { importQuestions, importFileSchema } from "../src/lib/content/import";

/**
 * Import practice questions from a JSON file into the question bank.
 *
 * Usage:
 *   npm run content:import -- content/generated/questions-....json --dry-run
 *   npm run content:import -- content/generated/questions-....json
 *   npm run content:import -- my-questions.json --allow-duplicates
 *
 * File shape:  { "items": [ { taskType, title, spoken?, payload, tags?, difficulty? }, ... ] }
 *
 * Audio-prompt tasks must include `spoken` (the TTS script). After importing
 * them, run `npm run seed:audio` to generate the recordings.
 */

const prisma = new PrismaClient();

async function main() {
  const fileArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error("Usage: npm run content:import -- <file.json> [--dry-run] [--allow-duplicates]");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const allowDuplicateTitles = process.argv.includes("--allow-duplicates");
  const file = path.resolve(process.cwd(), fileArg);

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`Could not read ${file}: ${(err as Error).message}`);
    process.exit(1);
  }

  const parsed = importFileSchema.safeParse(json);
  if (!parsed.success) {
    console.error("File does not match the expected shape { items: [...] }:");
    for (const i of parsed.error.issues) console.error(`  ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
  }

  const result = await importQuestions(parsed.data.items, { dryRun, allowDuplicateTitles });

  if (result.skipped.length) {
    console.log(`Skipped ${result.skipped.length} item(s):`);
    for (const s of result.skipped) console.log(`  - ${s.title}: ${s.reason}`);
  }

  if (dryRun) {
    console.log(`\nDry run: ${result.valid} item(s) would be imported. Nothing was written.`);
  } else {
    console.log(`\nImported ${result.created} item(s).`);
    if (result.created > 0) {
      console.log("If any were audio-prompt tasks, generate their audio with:");
      console.log("  npm run seed:audio");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
