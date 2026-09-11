import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Per-request Prisma client bound to the Worker’s D1 database.
 * Must not read Cloudflare bindings at module load time.
 */
export async function getDb(): Promise<PrismaClient> {
  const { env } = await getCloudflareContext({ async: true });
  // Binding is typed loosely in cloudflare-env.d.ts to avoid Workers DOM conflicts.
  const adapter = new PrismaD1(env.DB as ConstructorParameters<typeof PrismaD1>[0]);
  return new PrismaClient({ adapter });
}
