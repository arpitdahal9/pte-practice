import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <Link href="/" className="mb-6 font-display text-lg font-bold tracking-tight">
        PTE Practice
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Style-alike practice content for study purposes only. Not affiliated
        with or endorsed by Pearson PTE.
      </p>
    </div>
  );
}
