import { getAppUser, type AppUser } from "@/lib/guest";

/** Current app user (always the shared guest — auth removed). */
export async function getCurrentUser(): Promise<AppUser> {
  return getAppUser();
}

/** Pages used to require sign-in; now always returns the open guest user. */
export async function requirePageAuth(_callbackUrl?: string): Promise<AppUser> {
  return getAppUser();
}

/** Admin pages are open in this build. */
export async function requirePageAdmin(): Promise<AppUser> {
  return getAppUser();
}
