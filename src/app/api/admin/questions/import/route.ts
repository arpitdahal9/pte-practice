import { handler, ok, parseBody, requireAdmin } from "@/lib/api";
import { importQuestions, importFileSchema } from "@/lib/content/import";
import { z } from "zod";

const bodySchema = importFileSchema.extend({
  dryRun: z.boolean().default(false),
  allowDuplicateTitles: z.boolean().default(false),
});

/**
 * POST /api/admin/questions/import  (admin only)
 *
 * Bulk-import questions from a pasted/uploaded JSON payload — the same
 * validation path as `npm run content:import`. Returns per-item skip reasons so
 * the admin UI can show exactly what did not apply and why.
 */
export const POST = handler(async (req) => {
  await requireAdmin();
  const body = await parseBody(req, bodySchema);

  const result = await importQuestions(body.items, {
    dryRun: body.dryRun,
    allowDuplicateTitles: body.allowDuplicateTitles,
  });

  return ok(result, body.dryRun ? 200 : 201);
});
