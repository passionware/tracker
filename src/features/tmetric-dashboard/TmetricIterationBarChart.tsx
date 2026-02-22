import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithFrontServices } from "@/core/frontServices";
import { rd } from "@passionware/monads";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService";
import type { IterationSummary } from "./tmetric-dashboard.utils";

const CHART_COLORS = {
  cost: "var(--chart-2)",
  billing: "var(--chart-1)",
  profit: "var(--chart-3)",
};

function convertToTargetCurrency(
  values: CurrencyValue[],
  rateMap: Map<string, number>,
  targetCurrency: string,
): number {
  return values.reduce((sum, v) => {
    const key = `${v.currency.toUpperCase()}->${targetCurrency.toUpperCase()}`;
    const rate = rateMap.get(key) ?? 0;
    return sum + v.amount * rate;
  }, 0);
}

export function TmetricIterationBarChart({
  iterationSummary,
  services,
}: {
  iterationSummary: IterationSummary[];
  services: WithFrontServices["services"];
}) {
  const targetCurrency = "EUR";
  const allCurrencies = Array.from(
    new Set(
      iterationSummary.flatMap((i) =>
        [...i.cost, ...i.billing, ...i.profit].map((v) =>
          v.currency.toUpperCase(),
        ),
      ),
    ),
  );
  const exchangeRates = services.exchangeService.useExchangeRates(
    allCurrencies.length
      ? allCurrencies.map((from) => ({ from, to: targetCurrency }))
      : [{ from: "EUR", to: "EUR" }],
  );

  const chartData =
    rd.tryMap(exchangeRates, (rates) => {
      const rateMap = new Map<string, number>();
      rates.forEach((r) =>
        rateMap.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate),
      );
      return iterationSummary.map((iter) => ({
        name:
          iter.iterationLabel.length > 20
            ? `${iter.iterationLabel.slice(0, 20)}…`
            : iter.iterationLabel,
        cost: convertToTargetCurrency(iter.cost, rateMap, targetCurrency),
        billing: convertToTargetCurrency(iter.billing, rateMap, targetCurrency),
        profit: convertToTargetCurrency(iter.profit, rateMap, targetCurrency),
      }));
    }) ?? [];

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost, billing & profit by iteration</CardTitle>
        <CardDescription>
          Financial breakdown per iteration (converted to {targetCurrency})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: targetCurrency,
                    maximumFractionDigits: 0,
                  }).format(Number(v))
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: targetCurrency,
                  }).format(value)
                }
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="cost" fill={CHART_COLORS.cost} name="Cost" />
              <Bar
                dataKey="billing"
                fill={CHART_COLORS.billing}
                name="Billing"
              />
              <Bar dataKey="profit" fill={CHART_COLORS.profit} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
