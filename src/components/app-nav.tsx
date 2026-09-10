"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  History,
  LayoutDashboard,
  Menu,
  Shield,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/practice", label: "Practise", icon: BookOpen },
  { href: "/mock", label: "Mocks", icon: ClipboardList },
  { href: "/history", label: "History", icon: History },
];

const moreLinks = [
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin", icon: Shield },
];

/**
 * Application chrome. No sign-in / sign-out — the app is open.
 */
export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const item = (l: { href: string; label: string }, stacked: boolean) => {
    const active = pathname === l.href || pathname.startsWith(l.href + "/");
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative text-sm font-medium transition-colors",
          stacked ? "py-2.5" : "py-4",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {l.label === "Home" && !stacked ? "Dashboard" : l.label}
        {active && (
          <span
            className={cn(
              "absolute bg-readout",
              stacked ? "-left-3 top-2 bottom-2 w-0.5" : "inset-x-0 bottom-0 h-0.5",
            )}
            aria-hidden="true"
          />
        )}
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link
              href="/dashboard"
              className="font-display text-base font-bold tracking-tight"
            >
              PTE Practice
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              {links.map((l) => item(l, false))}
              {item(moreLinks[1], false)}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/profile"
              className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Profile
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t px-7 py-3 md:hidden">
            {links.map((l) => item(l, true))}
            {moreLinks.map((l) => item(l, true))}
          </nav>
        )}
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <ul className="mx-auto grid h-14 max-w-6xl grid-cols-4">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
