import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Stable local identity used now that accounts / login are removed. */
export const GUEST_EMAIL = "guest@ptepractice.local";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

/**
 * Ensure a single shared app user exists and return it.
 * Practice attempts, history, profile, and admin all hang off this id.
 */
export async function getAppUser(): Promise<AppUser> {
  const user = await prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    update: {},
    create: {
      email: GUEST_EMAIL,
      name: "Guest",
      role: "ADMIN",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // Keep admin open — no role restrictions in this build.
  if (user.role !== "ADMIN") {
    return prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  return user;
}
