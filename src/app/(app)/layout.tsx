import { requirePageAuth } from "@/lib/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Keeps a guest row in the DB for attempts / profile; no login gate.
  await requirePageAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:py-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
