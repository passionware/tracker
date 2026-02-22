import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart } from "@mui/x-charts/PieChart";
import type { ContractorIterationBreakdown } from "./tmetric-dashboard.utils";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
];

export function TmetricHoursPieChart({
  contractorBreakdown,
  contractorNameMap,
}: {
  contractorBreakdown: ContractorIterationBreakdown[];
  contractorNameMap: Map<number, string>;
}) {
  const data = contractorBreakdown
    .map((c) => ({
      name:
        contractorNameMap.get(c.contractorId) ?? `Contractor ${c.contractorId}`,
      value: c.total.hours,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (data.length === 0) return null;

  const total = data.reduce((s, x) => s + x.value, 0);
  const series = [
    {
      data: data.map((d, i) => {
        const pct =
          total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : "";
        return {
          id: i,
          value: d.value,
          // Arc: only percentage to avoid overlap. Legend/tooltip: full name + percentage.
          label: (location: "tooltip" | "legend" | "arc") =>
            location === "arc" ? pct : `${d.name} ${pct}`.trim(),
          color: PIE_COLORS[i % PIE_COLORS.length],
        };
      }),
      innerRadius: 0,
      outerRadius: 80,
      paddingAngle: 2,
      arcLabel: "label" as const,
      arcLabelMinAngle: 35,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours by contractor</CardTitle>
        <CardDescription>
          Distribution of tracked hours across contractors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <PieChart
            series={series}
            width={420}
            height={220}
            slotProps={{
              legend: {
                position: { vertical: "middle", horizontal: "end" },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
