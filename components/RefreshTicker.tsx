"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RefreshTicker({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(intervalMs / 1000);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          router.refresh();
          return intervalMs / 1000;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [router, intervalMs]);

  return (
    <span className="text-[10px] text-zinc-600 tabular-nums">
      refresh in {secondsLeft}s
    </span>
  );
}
