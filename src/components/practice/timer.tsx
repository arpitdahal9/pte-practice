"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

export function Timer({
  seconds,
  running = true,
  onExpire,
  className,
}: {
  seconds: number;
  running?: boolean;
  onExpire?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const expired = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    expired.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!expired.current) {
            expired.current = true;
            onExpire?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onExpire]);

  const low = remaining <= 10;
  return (
    <div
      role="timer"
      aria-live={low ? "assertive" : "off"}
      className={cn(
        // A readout, not a chip: mono numerals on a hairline rule.
        "inline-flex items-center gap-1.5 border-b-2 px-1 pb-1 font-mono text-lg font-medium tabular",
        low ? "border-destructive text-destructive" : "border-border text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {formatTime(remaining)}
    </div>
  );
}
