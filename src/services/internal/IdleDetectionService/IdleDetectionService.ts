import type { SimpleStoreReadOnly } from "@passionware/simple-store";

/**
 * Reactive view of "is the user currently idle?" the TrackerBar consumes
 * to decide whether to surface the "still working?" prompt while a timer
 * is running.
 *
 * `lastActivityAt` is the wall-clock of the most recent activity the
 * service observed (mouse move, key press, focus, etc). The bar uses it
 * to offer "Stop the timer at last activity" — preserving accurate time
 * even when the user walked away and came back hours later.
 */
export interface IdleState {
  lastActivityAt: Date;
  isIdle: boolean;
  /** Seconds since the last observed activity, sampled at the tick rate. */
  secondsSinceActivity: number;
}

/**
 * Activity detector.
 *
 * Wires browser-level "the human is here" signals (pointer/keyboard/focus
 * events on `window`) into a reactive store. Consumers ask `useIdleState`
 * with a threshold; the hook re-renders only when the boolean `isIdle`
 * flips, plus a once-per-tick refresh while idle so the prompt can show
 * "idle for X minutes" without polling.
 *
 * The implementation should be event-driven (not polling) for the
 * "active" path — listening for events is cheap and avoids touching
 * React on every mouse move. A 1Hz tick is only used while idle to update
 * the displayed counter.
 */
export interface IdleDetectionService {
  /** Reactive snapshot — for non-React consumers (tests, callers). */
  readonly state: SimpleStoreReadOnly<{ lastActivityAt: Date }>;

  /**
   * React hook returning the derived idle state for a given threshold.
   *
   * Multiple callers with different thresholds are safe: each computes
   * its own `isIdle` boolean against the shared `lastActivityAt`.
   */
  useIdleState(thresholdSeconds: number): IdleState;

  /** Imperative read — useful when constructing follow-up commands. */
  getLastActivityAt(): Date;

  /**
   * Manually mark the user as active (e.g. immediately after a Stop
   * click so a subsequent Start doesn't immediately fire the idle
   * prompt). Most callers don't need this — DOM events already cover it.
   */
  markActive(): void;
}

export interface WithIdleDetectionService {
  idleDetectionService: IdleDetectionService;
}
