import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { rd, type RemoteData } from "@passionware/monads";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { WithFormatService } from "@/services/FormatService/FormatService";
import type { ChartDatum } from "./BudgetTargetHistoryChart.utils.ts";
import { useBudgetTargetChartData } from "./useBudgetTargetChartData";

const TARGET_COLOR = "var(--fg-destructive)";
const TARGET_AREA_FILL =
  "color-mix(in oklch, var(--color-destructive) 25%, transparent)";
const BILLING_COLOR = "var(--color-muted-foreground)";

const BUDGET_CHART_CONFIG = {
  target: {
    label: "Target",
    color: TARGET_COLOR,
  },
  billing: {
    label: "Billing",
    color: BILLING_COLOR,
  },
  forecast: {
    label: "Forecast",
    color: BILLING_COLOR,
  },
} satisfies ChartConfig;

/** One day in ms: sparkline min span and X-axis end padding (+1 day past logical range end). */
const MS_PER_DAY = 86_400_000;

/**
 * Sparkline: map X from first datum to max(last datum, period end) so the first point sits on the
 * left edge of the plot (no empty band before the first log). Calendar `periodRange` alone would
 * leave a gap when the first entry is after period start.
 */
function sparklineXDomain(
  data: ChartDatum[],
  periodRange: { start: number; end: number } | undefined,
  calendarFallback: [number, number],
): [number, number] {
  const times = data.map((d) => d.date);
  const lo = Math.min(...times);
  const hiData = Math.max(...times);
  const hi =
    periodRange != null ? Math.max(hiData, periodRange.end) : hiData;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return calendarFallback;
  }
  if (hi - lo < 60_000) {
    return [lo, lo + MS_PER_DAY];
  }
  return [lo, hi];
}

export function BudgetTargetHistoryChart({
  logEntries,
  iterationCurrency,
  formatService,
  periodRange,
  variant = "default",
  yDomain,
  xViewportMinMs,
  xViewportMaxMs,
}: {
  logEntries: RemoteData<BudgetTargetLogEntry[]>;
  iterationCurrency: string;
  formatService: WithFormatService["formatService"];
  periodRange?: { start: number; end: number };
  /**
   * `embedded`: no heading, chart fills parent (keeps axis ticks).
   * `compact`: timeline sparkline — horizontal grid only; X scale fits data (first point at the left)
   * while still spanning through `periodRange.end` for forecast shading; tooltip shows the date.
   */
  variant?: "default" | "embedded" | "compact";
  /** Fixed Y scale (e.g. shared across charts in the same timeline lane). */
  yDomain?: [number, number] | null;
  /**
   * Optional hard X-axis window (epoch ms). When **both** are set and `max &gt; min`, this replaces
   * the automatic domain (including compact data-fit). Omit for sparkline mode to keep the first
   * point flush left with no leading gap.
   */
  xViewportMinMs?: number | null;
  xViewportMaxMs?: number | null;
}) {
  const chartResultRd = useBudgetTargetChartData({
    logEntries,
    iterationCurrency,
    periodRange,
    yDomain: yDomain ?? undefined,
  });

  const isSparkline = variant === "compact";
  const isEmbeddedLayout = variant === "embedded" || isSparkline;

  return rd.tryMap(chartResultRd, (r) => {
    if (r.isEmpty) {
      if (isSparkline) {
        return null;
      }
      return (
        <p
          className={
            isEmbeddedLayout
              ? "text-[10px] text-muted-foreground px-1 py-0.5 leading-tight"
              : "text-xs text-muted-foreground py-2"
          }
        >
          No budget target history yet. Update the target to record history.
        </p>
      );
    }
    const { data, xDomain, lastRealDataDate, hasForecast, yDomain: yScale } =
      r;
    const calendarXDomain: [number, number] =
      Array.isArray(xDomain) &&
      xDomain.length === 2 &&
      typeof xDomain[0] === "number" &&
      typeof xDomain[1] === "number"
        ? [xDomain[0], xDomain[1]]
        : [
            periodRange?.start ?? 0,
            periodRange?.end ?? MS_PER_DAY,
          ];
    const plotXDomainBase = isSparkline
      ? sparklineXDomain(data, periodRange, calendarXDomain)
      : xDomain;
    const plotXDomain =
      xViewportMinMs != null &&
      xViewportMaxMs != null &&
      xViewportMaxMs > xViewportMinMs
        ? ([xViewportMinMs, xViewportMaxMs] as [number, number])
        : plotXDomainBase;
    const plotXDomainForAxis =
      Array.isArray(plotXDomain) &&
      plotXDomain.length === 2 &&
      typeof plotXDomain[0] === "number" &&
      typeof plotXDomain[1] === "number"
        ? ([plotXDomain[0], plotXDomain[1] + MS_PER_DAY] as [number, number])
        : plotXDomain;
    return (
      <div
        className={
          isEmbeddedLayout
            ? "budget-target-chart flex h-full min-h-0 min-w-0 flex-col"
            : "space-y-1 budget-target-chart"
        }
      >
        {variant === "default" ? (
          <p className="text-xs font-medium text-muted-foreground">
            Billing vs target over time
          </p>
        ) : null}
        <ChartContainer
          config={BUDGET_CHART_CONFIG}
          className={
            isSparkline
              ? "aspect-auto h-full min-h-[72px] w-full min-w-0 flex-1 justify-stretch p-0 [&_.recharts-responsive-container]:!w-full [&_.recharts-responsive-container]:max-w-none"
              : isEmbeddedLayout
                ? "h-full min-h-[72px] w-full flex-1"
                : "h-[140px] w-full"
          }
        >
          <ComposedChart
            data={data}
            margin={
              isSparkline
                ? { left: 0, right: 0, top: 0, bottom: 0 }
                : { left: 0, right: 0, top: 4, bottom: 0 }
            }
          >
            {isSparkline ? (
              <CartesianGrid
                strokeDasharray="2 2"
                horizontal
                vertical={false}
              />
            ) : (
              <CartesianGrid strokeDasharray="2 2" vertical={false} />
            )}
            {periodRange != null &&
              lastRealDataDate != null &&
              periodRange.end > lastRealDataDate && (
                <ReferenceArea
                  x1={lastRealDataDate}
                  x2={periodRange.end}
                  fill="var(--muted-foreground)"
                  fillOpacity={0.08}
                />
              )}
            <XAxis
              dataKey="date"
              type="number"
              scale="time"
              domain={plotXDomainForAxis}
              hide={isSparkline}
              allowDataOverflow={isSparkline}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(ts) => format(new Date(ts), "MMM d")}
            />
            <YAxis
              orientation="right"
              hide={isSparkline}
              domain={
                isSparkline && yScale != null ? yScale : undefined
              }
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                Number(v).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
              }
            />
            <ChartTooltip
              isAnimationActive={!isSparkline}
              content={
                <ChartTooltipContent
                  className={
                    isSparkline
                      ? "rounded-none border-border bg-background shadow-none dark:bg-background"
                      : undefined
                  }
                  labelClassName={
                    isSparkline
                      ? "font-normal text-[10px] text-muted-foreground"
                      : undefined
                  }
                  labelFormatter={
                    isSparkline
                      ? (_value, tooltipPayload) => {
                          const row = tooltipPayload?.[0]?.payload as
                            | ChartDatum
                            | undefined;
                          if (!row) return null;
                          return format(new Date(row.date), "MMM d, yyyy");
                        }
                      : undefined
                  }
                  formatter={(value, name, item) => {
                    const payload = item?.payload;
                    const symbol = (c: string) =>
                      formatService.financial.currencySymbol(c) ??
                      c?.toUpperCase() ??
                      "";
                    if (name === "target") {
                      return [
                        `${symbol(iterationCurrency)} ${Number(value).toLocaleString()}`,
                        BUDGET_CHART_CONFIG.target.label,
                      ];
                    }
                    if (name === "billing" && payload?.billingCurrency) {
                      return [
                        `${symbol(payload.billingCurrency)} ${Number(value).toLocaleString()}`,
                        BUDGET_CHART_CONFIG.billing.label,
                      ];
                    }
                    if (name === "forecast" && payload?.billingCurrency) {
                      return [
                        `${symbol(payload.billingCurrency)} ${Number(value).toLocaleString()}`,
                        BUDGET_CHART_CONFIG.forecast.label,
                      ];
                    }
                    return [Number(value).toLocaleString(), name];
                  }}
                />
              }
            />
            <Area
              type="stepAfter"
              dataKey="target"
              stroke={TARGET_COLOR}
              fill={TARGET_AREA_FILL}
              strokeWidth={isSparkline ? 1.5 : 2}
              strokeLinecap={isSparkline ? "butt" : "round"}
              strokeLinejoin={isSparkline ? "miter" : "round"}
              dot={false}
              activeDot={
                isSparkline
                  ? { r: 3, fill: TARGET_COLOR, strokeWidth: 0 }
                  : { r: 4, fill: TARGET_COLOR, strokeWidth: 0 }
              }
              connectNulls
              isAnimationActive={!isSparkline}
            />
            <Line
              type="monotone"
              dataKey="billing"
              stroke={BILLING_COLOR}
              strokeWidth={isSparkline ? 1.5 : 2}
              strokeLinecap={isSparkline ? "butt" : "round"}
              strokeLinejoin={isSparkline ? "miter" : "round"}
              dot={false}
              activeDot={
                isSparkline
                  ? { r: 3, fill: BILLING_COLOR, strokeWidth: 0 }
                  : { r: 4, fill: BILLING_COLOR, strokeWidth: 0 }
              }
              connectNulls={false}
              isAnimationActive={!isSparkline}
            />
            {hasForecast && (
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={BILLING_COLOR}
                strokeWidth={isSparkline ? 1 : 1.5}
                strokeDasharray="5 4"
                strokeLinecap={isSparkline ? "butt" : "round"}
                strokeLinejoin={isSparkline ? "miter" : "round"}
                dot={false}
                activeDot={
                  isSparkline
                    ? { r: 2.5, fill: BILLING_COLOR, strokeWidth: 0 }
                    : { r: 3, fill: BILLING_COLOR, strokeWidth: 0 }
                }
                connectNulls={false}
                isAnimationActive={!isSparkline}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </div>
    );
  }) ?? null;
}
