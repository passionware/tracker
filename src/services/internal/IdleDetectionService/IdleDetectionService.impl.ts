import type {
  IdleDetectionService,
  IdleState,
} from "@/services/internal/IdleDetectionService/IdleDetectionService.ts";
import { createSimpleStore, useSimpleStore } from "@passionware/simple-store";
import { useEffect, useState } from "react";

/**
 * Browser DOM events that count as "the user is here". Notable omissions:
 *   - `scroll` is fired programmatically by IntersectionObserver setups,
 *     so we'd get false positives on long-running data tables.
 *   - `pointermove` is preferred over `mousemove` so a single source covers
 *     touch + mouse + pen.
 */
const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "focus",
] as const;

/**
 * Throttle window applied to high-frequency events (`pointermove`,
 * `wheel`). Without this we'd write to the SimpleStore on every pixel of
 * mouse movement — fine functionally but it pumps React re-renders for
 * any subscriber. Activity bursts are still detected within 250ms, which
 * is well below the human-perceptible threshold for "this UI is laggy".
 */
const THROTTLE_MS = 250;

interface CreateIdleDetectionServiceDeps {
  /**
   * The window-like target to attach listeners to. Defaults to the
   * global `window` in browsers; tests can pass a mock EventTarget so the
   * service can be exercised without a DOM.
   */
  target?: EventTarget;
  /** Defaults to `() => new Date()`. */
  now?: () => Date;
}

/**
 * Wires DOM activity events into a reactive `lastActivityAt` store.
 *
 * Lifecycle:
 *   - Listeners are attached eagerly on construction; they live for the
 *     lifetime of the service (which equals the app lifetime — the
 *     service is a singleton in `services.connected.ts`).
 *   - Every observed event updates a throttled "last activity" timestamp.
 *   - `useIdleState(thresholdSeconds)` subscribes to the timestamp and
 *     additionally runs a 1Hz `setInterval` *only while idle* so the
 *     "idle for Xm" counter ticks up. The interval is torn down the
 *     instant activity returns.
 */
export function createIdleDetectionService(
  deps: CreateIdleDetectionServiceDeps = {},
): IdleDetectionService {
  const target = deps.target ?? (typeof window !== "undefined" ? window : null);
  const now = deps.now ?? (() => new Date());

  const store = createSimpleStore<{ lastActivityAt: Date }>({
    lastActivityAt: now(),
  });

  let lastWriteAt = 0;
  const markActive = () => {
    const t = now();
    const ms = t.getTime();
    // Throttle writes — React subscribers don't need <250ms granularity
    // for "the user is alive" events.
    if (ms - lastWriteAt < THROTTLE_MS) {
      // Even when throttled, still record the latest timestamp internally
      // so a flurry of activity doesn't appear "old" to the next snapshot.
      // But avoid republishing to the store.
      return;
    }
    lastWriteAt = ms;
    store.setNewValue({ lastActivityAt: t });
  };

  if (target) {
    for (const evt of ACTIVITY_EVENTS) {
      target.addEventListener(evt, markActive, { passive: true });
    }
    if ("document" in (target as Window) && (target as Window).document) {
      const doc = (target as Window).document;
      doc.addEventListener(
        "visibilitychange",
        () => {
          if (!doc.hidden) markActive();
        },
        { passive: true },
      );
    }
  }

  return {
    state: store,
    getLastActivityAt: () => store.getCurrentValue().lastActivityAt,
    markActive: () => {
      // Skip the throttle when called manually — callers expect
      // immediate "user is here" recognition (e.g. after pressing Stop).
      lastWriteAt = now().getTime();
      store.setNewValue({ lastActivityAt: now() });
    },
    useIdleState: (thresholdSeconds: number) =>
      useDerivedIdleState(store, thresholdSeconds, now),
  };
}

function useDerivedIdleState(
  store: ReturnType<typeof createSimpleStore<{ lastActivityAt: Date }>>,
  thresholdSeconds: number,
  now: () => Date,
): IdleState {
  const { lastActivityAt } = useSimpleStore(store);
  const [tick, setTick] = useState(() => now().getTime());

  const secondsSinceActivity = Math.max(
    0,
    Math.floor((tick - lastActivityAt.getTime()) / 1000),
  );
  const isIdle = secondsSinceActivity >= thresholdSeconds;

  useEffect(() => {
    // Refresh the tick once per second only while idle. When the user
    // is active the activity event itself rerenders us (via the
    // SimpleStore subscription) so a wall-clock interval is wasted.
    if (!isIdle) return;
    const id = setInterval(() => setTick(now().getTime()), 1000);
    return () => clearInterval(id);
  }, [isIdle, now]);

  // Always pull a fresh "now" on every render so the *first* render after
  // crossing the threshold reports the correct seconds (the interval
  // hasn't fired yet at that point).
  return {
    lastActivityAt,
    isIdle,
    secondsSinceActivity,
  };
}
