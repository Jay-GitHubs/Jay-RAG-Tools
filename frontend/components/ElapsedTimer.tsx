"use client";

import { useState, useEffect } from "react";
import { formatDuration, elapsedSince } from "@/lib/format";

interface ElapsedTimerProps {
  startedAt: string;
}

export default function ElapsedTimer({ startedAt }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(() => elapsedSince(startedAt));

  useEffect(() => {
    setElapsed(elapsedSince(startedAt));
    const interval = setInterval(() => {
      setElapsed(elapsedSince(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="tabular-nums text-blue-600 font-medium">
      {formatDuration(elapsed)}
    </span>
  );
}
