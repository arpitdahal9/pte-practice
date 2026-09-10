import { handler, ok, requireUser, ApiError } from "@/lib/api";
import { pickNextQuestions } from "@/lib/queries";
import { TaskType } from "@prisma/client";

/**
 * GET /api/questions/next?taskType=&exclude=id1,id2&take=1
 *
 * Returns the next question(s) for the signed-in user, skipping ones they have
 * already attempted or already been served this session. Replaces the old
 * `?random=1` path, which shuffled the whole bank with no memory of what the
 * user had just seen.
 */
export const GET = handler(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);

  const taskType = url.searchParams.get("taskType") as TaskType | null;
  if (!taskType || !Object.values(TaskType).includes(taskType)) {
    throw new ApiError("A valid taskType is required", 400);
  }

  const exclude = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const take = Math.min(Math.max(Number(url.searchParams.get("take") ?? 1), 1), 20);

  const questions = await pickNextQuestions(user.id, taskType, { exclude, take });
  return ok({ questions });
});
