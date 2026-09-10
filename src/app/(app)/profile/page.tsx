import { prisma } from "@/lib/db";
import { requirePageAuth } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile — PTE Practice" };

export default async function ProfilePage() {
  const sessionUser = await requirePageAuth();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, targetScore: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <ProfileForm
        initialName={user?.name ?? ""}
        initialTarget={user?.targetScore ?? null}
        email={user?.email ?? sessionUser.email ?? ""}
      />
    </div>
  );
}
