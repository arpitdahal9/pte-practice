import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { updateProfileSchema } from "@/lib/validation/profile";

export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, updateProfileSchema);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name ?? undefined,
      targetScore: body.targetScore === undefined ? undefined : body.targetScore,
    },
    select: { name: true, targetScore: true },
  });

  return ok({ user: updated });
});
