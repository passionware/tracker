import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithFrontServices } from "@/core/frontServices";
import { BarChart } from "@mui/x-charts/BarChart";
import { rd } from "@passionware/monads";
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

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(value);
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
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Cost, billing & profit by iteration</CardTitle>
        <CardDescription>
          Financial breakdown per iteration (converted to {targetCurrency})
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="h-[280px] w-full min-w-0">
          <BarChart
            dataset={chartData}
            xAxis={[
              {
                scaleType: "band",
                dataKey: "name",
                tickLabelStyle: { fontSize: 11 },
                tickPlacement: "middle",
              },
            ]}
            yAxis={[
              {
                tickLabelStyle: { fontSize: 11 },
                valueFormatter: (v: unknown) =>
                  formatCurrency(Number(v), targetCurrency),
              },
            ]}
            series={[
              {
                dataKey: "cost",
                label: "Cost",
                color: CHART_COLORS.cost,
                valueFormatter: (v: unknown) =>
                  formatCurrency(Number(v), targetCurrency),
              },
              {
                dataKey: "billing",
                label: "Billing",
                color: CHART_COLORS.billing,
                valueFormatter: (v: unknown) =>
                  formatCurrency(Number(v), targetCurrency),
              },
              {
                dataKey: "profit",
                label: "Profit",
                color: CHART_COLORS.profit,
                valueFormatter: (v: unknown) =>
                  formatCurrency(Number(v), targetCurrency),
              },
            ]}
            height={280}
            margin={{ top: 8, right: 8, left: 0, bottom: 60 }}
            grid={{ vertical: true, horizontal: true }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
