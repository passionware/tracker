import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import type { TmetricDashboardCacheScope } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { WithFrontServices } from "@/core/frontServices";
import { getCumulativeBillingByDay } from "@/features/tmetric-dashboard/tmetric-dashboard.utils";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { rd } from "@passionware/monads";
import { endOfDay, format, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const SKIP_SYNC_IF_DONE_WITHIN_MS = 60 * 60 * 1000; // 1 hour

/** Build rate map key. */
function rateKey(from: string, to: string): string {
  return `${from.toUpperCase()}->${to.toUpperCase()}`;
}

/** Collect all billing currencies from report role types. */
function getReportBillingCurrencies(
  report: { definitions: { roleTypes: Record<string, { rates: Array<{ billingCurrency: string }> }> } },
): Set<string> {
  const set = new Set<string>();
  for (const role of Object.values(report.definitions.roleTypes)) {
    for (const r of role.rates) {
      set.add(r.billingCurrency);
    }
  }
  return set;
}

export interface UseBudgetLogSyncParams {
  services: WithFrontServices["services"];
  iterations: ProjectIteration[];
  scope: TmetricDashboardCacheScope;
}

export interface UseBudgetLogSyncResult {
  /** Run sync now (ignores "last hour" skip). Use for manual Sync budget log button. */
  syncBudgetLogNow: () => Promise<void>;
  isSyncing: boolean;
}

/**
 * Runs a one-off background sync of budget target log from TMetric on page load
 * unless we already synced within the last hour with the same active iteration ids (localStorage).
 * - For each active iteration, ensures there is a log entry for today (update or backfill from last log day to today).
 * - Shows a toast with what was synced.
 * - Returns syncBudgetLogNow() for manual sync and isSyncing state.
 */
export function useBudgetLogSync({
  services,
  iterations,
  scope,
}: UseBudgetLogSyncParams): UseBudgetLogSyncResult {
  const iterationTriggerService = services.iterationTriggerService;
  const tmetricDashboardService = services.tmetricDashboardService;
  const mutationService = services.mutationService;
  const exchangeService = services.exchangeService;
  const preferenceService = services.preferenceService;

  const [isSyncing, setIsSyncing] = useState(false);

  // Exchange pairs: from each iteration currency to each iteration currency (for prefetch). Report billing currencies are filled on demand in buildRateMapForIteration.
  const exchangePairs = useMemo(
    () => {
      if (iterations.length === 0) return [];
      const fromSet = new Set(iterations.map((i) => i.currency));
      const fromList = [...fromSet];
      return fromList.flatMap((from) =>
        iterations.map((i) => ({ from, to: i.currency })),
      );
    },
    [iterations],
  );

  const exchangeRates = exchangeService.useExchangeRates(exchangePairs);
  const hasRunRef = useRef(false);

  const runSync = useCallback(
    async (options: { skipIfRecent: boolean }) => {
      if (
        iterations.length === 0 ||
        !scope.projectIterationIds ||
        (Array.isArray(scope.projectIterationIds) &&
          scope.projectIterationIds.length === 0)
      ) {
        return;
      }

      const iterationIds = iterations.map((i) => i.id);
      if (options.skipIfRecent) {
        const stored = await preferenceService.getBudgetLogSyncState();
        if (stored && Date.now() - stored.lastSyncAt <= SKIP_SYNC_IF_DONE_WITHIN_MS) {
          const current = [...iterationIds].sort((a, b) => a - b);
          const prev = stored.iterationIds;
          if (
            current.length === prev.length &&
            current.every((id, i) => id === prev[i])
          ) {
            return;
          }
        }
      }

      const today = endOfDay(new Date());
      const iterationEndDates = iterations.map((i) =>
        endOfDay(calendarDateToJSDate(i.periodEnd)),
      );
      const maxIterationEnd = new Date(
        Math.max(...iterationEndDates.map((d) => d.getTime())),
      );
      /** Report range end: do not go beyond today nor beyond latest iteration end. */
      const rangeEnd = new Date(
        Math.min(today.getTime(), maxIterationEnd.getTime()),
      );

    const logsByIteration = await Promise.all(
      iterations.map(async (iter) => ({
        iteration: iter,
        entries: await iterationTriggerService.getLogEntries(iter.id),
      })),
    );

    let rangeStart: Date | null = null;

    for (const { iteration, entries } of logsByIteration) {
      const iterStart = startOfDay(calendarDateToJSDate(iteration.periodStart));
      const lastEntryDate =
        entries.length > 0
          ? (() => {
              const sorted = [...entries].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
              );
              return startOfDay(new Date(sorted[sorted.length - 1].createdAt));
            })()
          : null;
      const start = lastEntryDate ?? iterStart;
      if (!rangeStart || start.getTime() < rangeStart.getTime()) {
        rangeStart = start;
      }
    }

    if (!rangeStart || rangeStart.getTime() > rangeEnd.getTime()) {
      return;
    }

    const result = await tmetricDashboardService.refreshAndCache({
      scope,
      periodStart: rangeStart,
      periodEnd: rangeEnd,
    });

    const report = result.data;
    const reportCurrencies = getReportBillingCurrencies(report);

    const buildRateMapForIteration = async (
      iter: ProjectIteration,
    ): Promise<Map<string, number>> => {
      const map = new Map<string, number>();
      const to = iter.currency.toUpperCase();
      const ratesArray = rd.tryMap(exchangeRates, (x) => x) ?? [];
      for (const r of ratesArray) {
        if (r.to.toUpperCase() === to) {
          map.set(rateKey(r.from, r.to), r.rate);
        }
      }
      for (const from of reportCurrencies) {
        const key = rateKey(from, iter.currency);
        if (!map.has(key)) {
          try {
            const rate = await exchangeService.ensureExchange(from, iter.currency, 1);
            map.set(key, rate);
          } catch {
            // leave missing – sumCurrencyValuesInTarget will use 0
          }
        }
      }
      return map;
    };

    let totalUpdated = 0;
    let totalInserted = 0;
    const iterIdsSynced = new Set<number>();

    for (const { iteration, entries } of logsByIteration) {
      const iterStart = startOfDay(calendarDateToJSDate(iteration.periodStart));
      const iterEnd = endOfDay(calendarDateToJSDate(iteration.periodEnd));
      /** Per-iteration sync end: min(today, end of iteration). Do not sync beyond iteration period. */
      const syncEnd = new Date(
        Math.min(today.getTime(), iterEnd.getTime()),
      );
      const lastEntryDate =
        entries.length > 0
          ? startOfDay(
              new Date(
                [...entries].sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                )[entries.length - 1].createdAt,
              ),
            )
          : null;
      const syncStart = lastEntryDate ?? iterStart;
      if (syncStart.getTime() > syncEnd.getTime()) continue;

      const rateMap = await buildRateMapForIteration(iteration);
      /** Cumulative billing at end of each day from report (within [syncStart, syncEnd]). */
      const byDay = getCumulativeBillingByDay(
        report,
        iteration.id,
        syncStart,
        syncEnd,
        iteration.currency,
        rateMap,
      );

      /** Base = previous log entry's billing so the series is monotonic (each stored value = base + report cumulative). */
      const entriesSorted = [...entries].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const syncStartDayKey = format(syncStart, "yyyy-MM-dd");
      const lastEntryBeforeSync = entriesSorted
        .filter((e) => format(new Date(e.createdAt), "yyyy-MM-dd") < syncStartDayKey)
        .pop();
      const base = lastEntryBeforeSync?.billingSnapshotAmount ?? 0;

      const entriesByDay = new Map(
        entries.map((e) => [format(new Date(e.createdAt), "yyyy-MM-dd"), e]),
      );

      for (const { date, cumulativeBilling } of byDay) {
        /** Store monotonic value: previous total + report cumulative for this period. */
        const amount = base + cumulativeBilling;
        const dayKey = format(date, "yyyy-MM-dd");
        const existing = entriesByDay.get(dayKey);
        if (existing) {
          /** Do not update entries where the user set a target; preserve exact value at which target was set. */
          if (existing.newTargetAmount == null) {
            await mutationService.updateBudgetTargetLogEntry(existing.id, {
              billingSnapshotAmount: amount,
              billingSnapshotCurrency: iteration.currency,
            });
            totalUpdated++;
            iterIdsSynced.add(iteration.id);
          }
        } else {
          await mutationService.insertBudgetTargetLogEntry(iteration.id, {
            createdAt: date,
            newTargetAmount: null,
            billingSnapshotAmount: amount,
            billingSnapshotCurrency: iteration.currency,
          });
          totalInserted++;
          iterIdsSynced.add(iteration.id);
        }
      }
    }

    await preferenceService.setBudgetLogSyncState({
      lastSyncAt: Date.now(),
      iterationIds: [...iterationIds].sort((a, b) => a - b),
    });

    if (totalUpdated > 0 || totalInserted > 0) {
      const parts: string[] = [];
      if (totalInserted > 0) parts.push(`${totalInserted} inserted`);
      if (totalUpdated > 0) parts.push(`${totalUpdated} updated`);
      toast.success(
        `Budget log synced: ${parts.join(", ")} for ${iterIdsSynced.size} iteration(s).`,
      );
    }
  }, [
    iterations,
    scope,
    iterationTriggerService,
    tmetricDashboardService,
    mutationService,
    exchangeService,
    preferenceService,
    exchangeRates,
  ]);

  const syncBudgetLogNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await runSync({ skipIfRecent: false });
    } catch {
      toast.error("Failed to sync budget log from TMetric.");
    } finally {
      setIsSyncing(false);
    }
  }, [runSync]);

  useEffect(() => {
    if (
      hasRunRef.current ||
      iterations.length === 0 ||
      exchangePairs.length === 0 ||
      !rd.isSuccess(exchangeRates)
    ) {
      return;
    }
    hasRunRef.current = true;
    runSync({ skipIfRecent: true }).catch(() => {
      hasRunRef.current = false;
      toast.error("Failed to sync budget log from TMetric.");
    });
  }, [iterations.length, exchangePairs.length, exchangeRates, runSync]);

  return { syncBudgetLogNow, isSyncing };
}
