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

export function BudgetTargetHistoryChart({
  logEntries,
  iterationCurrency,
  formatService,
  periodRange,
}: {
  logEntries: RemoteData<BudgetTargetLogEntry[]>;
  iterationCurrency: string;
  formatService: WithFormatService["formatService"];
  periodRange?: { start: number; end: number };
}) {
  const chartResultRd = useBudgetTargetChartData({
    logEntries,
    iterationCurrency,
    periodRange,
  });

  return rd.tryMap(chartResultRd, (r) => {
    if (r.isEmpty) {
      return (
        <p className="text-xs text-muted-foreground py-2">
          No budget target history yet. Update the target to record history.
        </p>
      );
    }
    const { data, xDomain, lastRealDataDate, hasForecast } = r;
    return (
      <div className="space-y-1 budget-target-chart">
        <p className="text-xs font-medium text-muted-foreground">
          Billing vs target over time
        </p>
        <ChartContainer
          config={BUDGET_CHART_CONFIG}
          className="h-[140px] w-full"
        >
          <ComposedChart
            data={data}
            margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 2" vertical={false} />
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
              domain={xDomain}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(ts) => format(new Date(ts), "MMM d")}
            />
            <YAxis
              orientation="right"
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
              content={
                <ChartTooltipContent
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
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: TARGET_COLOR, strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="billing"
              stroke={BILLING_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: BILLING_COLOR, strokeWidth: 0 }}
              connectNulls={false}
            />
            {hasForecast && (
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={BILLING_COLOR}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{ r: 3, fill: BILLING_COLOR, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </div>
    );
  }) ?? null;
}
