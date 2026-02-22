import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours by contractor</CardTitle>
        <CardDescription>
          Distribution of tracked hours across contractors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}h`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name.length > 12 ? `${name.slice(0, 12)}…` : name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
