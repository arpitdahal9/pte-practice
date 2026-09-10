/**
 * Auth was removed from this app. Kept as a no-op module so any leftover
 * imports fail closed instead of initializing NextAuth.
 */
export async function auth() {
  return null;
}

export async function signIn() {
  throw new Error("Authentication is disabled");
}

export async function signOut() {
  throw new Error("Authentication is disabled");
}

export const handlers = {
  GET: async () => new Response("Authentication is disabled", { status: 410 }),
  POST: async () => new Response("Authentication is disabled", { status: 410 }),
};
