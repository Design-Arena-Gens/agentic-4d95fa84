"use client";
import clsx from "clsx";
import type { Signal } from "@/lib/types";

export function SignalBadge({ signal }: { signal: Signal | null }) {
  const cls = clsx("badge", signal ? (signal.side === "UP" ? "up" : "down") : "neutral");
  return (
    <span className={cls}>
      {signal ? signal.side : "Waiting"}
    </span>
  );
}
