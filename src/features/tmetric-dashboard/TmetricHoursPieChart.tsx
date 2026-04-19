import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart } from "@mui/x-charts/PieChart";
import { useLayoutEffect, useRef, useState } from "react";
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

  const total = data.reduce((s, x) => s + x.value, 0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(300);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setChartWidth(Math.max(220, Math.min(440, Math.floor(w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return null;

  const chartHeight = Math.round(Math.min(260, chartWidth * 0.52));
  const outerRadius = Math.round(Math.min(78, chartWidth * 0.2));
  const legendNarrow = chartWidth < 380;

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
      outerRadius,
      paddingAngle: 2,
      arcLabel: "label" as const,
      arcLabelMinAngle: 35,
    },
  ];

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Hours by contractor</CardTitle>
        <CardDescription>
          Distribution of tracked hours across contractors
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 px-3 sm:px-6">
        <div
          ref={wrapRef}
          className="mx-auto flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-2"
        >
          <PieChart
            series={series}
            width={chartWidth}
            height={chartHeight}
            slotProps={{
              legend: {
                position: legendNarrow
                  ? { vertical: "bottom", horizontal: "center" }
                  : { vertical: "middle", horizontal: "end" },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
