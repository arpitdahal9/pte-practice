import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

/**
 * Optional: generate real audio for listening/speaking-prompt questions using
 * OpenAI TTS, from the spoken script stored in Question.promptText. Run after
 * seeding, with OPENAI_API_KEY set:  npm run seed:audio
 *
 * Idempotent: only fills questions that need audio and don't have it yet.
 */
const prisma = new PrismaClient();

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("OPENAI_API_KEY is not set — cannot generate audio. Add it to .env and retry.");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: key });
  const outDir = path.join(process.cwd(), "public", "uploads", "seed", "audio");
  mkdirSync(outDir, { recursive: true });

  const questions = await prisma.question.findMany({
    where: { mediaType: "audio", mediaUrl: null, promptText: { not: null } },
    select: { id: true, promptText: true },
  });

  console.log(`Generating audio for ${questions.length} questions…`);
  let done = 0;
  for (const q of questions) {
    try {
      const speech = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: q.promptText!,
      });
      const buf = Buffer.from(await speech.arrayBuffer());
      const file = `${q.id}.mp3`;
      writeFileSync(path.join(outDir, file), buf);
      await prisma.question.update({
        where: { id: q.id },
        data: { mediaUrl: `/uploads/seed/audio/${file}` },
      });
      done++;
      if (done % 5 === 0) console.log(`  …${done}/${questions.length}`);
    } catch (err) {
      console.error(`  Failed for ${q.id}:`, (err as Error).message);
    }
  }
  console.log(`Done. Generated ${done}/${questions.length} audio files.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
