import { useEffect, useState } from "react";

/**
 * Tick-once-per-second hook that returns whole seconds elapsed since
 * `startedAt`. Used by the running TrackerBar to render the live timer
 * without ratcheting up React renders.
 *
 * Returns `null` when `startedAt` is null/undefined; the caller can render
 * placeholder UI without a guard.
 */
export function useElapsedSeconds(
  startedAt: string | Date | null | undefined,
): number | null {
  const startedAtMs =
    startedAt === null || startedAt === undefined
      ? null
      : typeof startedAt === "string"
        ? Date.parse(startedAt)
        : startedAt.getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAtMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAtMs]);
  if (startedAtMs === null) return null;
  return Math.max(0, Math.floor((now - startedAtMs) / 1000));
}

/**
 * Format `H:MM:SS` (omitting hours when zero). Used by the TrackerBar
 * elapsed pill and the entries list duration column.
 */
export function formatElapsedSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}
