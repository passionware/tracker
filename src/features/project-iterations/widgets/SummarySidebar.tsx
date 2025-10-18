/**
 * Summary Sidebar Component
 *
 * Displays summary statistics and sunburst chart using shared cube context.
 * Can be used independently in dashboard layouts.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import { CubeSunburst } from "@/features/_common/Cube/CubeSunburst.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";

interface SummarySidebarProps extends WithFrontServices {
  report: GeneratedReportSource;
}

export function SummarySidebar({ report }: SummarySidebarProps) {
  const { state, measures } = useCubeContext();
  const selectedMeasure = measures[0];
  const cube = state.cube;

  return (
    <div className="w-64 border-r border-slate-200 bg-white overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Summary Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {measures.map((measure) => {
              const cell = cube.grandTotals.find(
                (c: any) => c.measureId === measure.id,
              );
              const value = cell?.value ?? 0;
              const formattedValue = cell?.formattedValue ?? String(value);

              return (
                <div
                  key={measure.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {measure.icon && (
                      <span className="text-sm">{measure.icon}</span>
                    )}
                    <span className="text-sm text-slate-600">
                      {measure.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formattedValue}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Sunburst Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Hierarchical Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CubeSunburst
              state={state}
              measure={selectedMeasure as any}
              dimensions={useCubeContext().dimensions as any}
              maxLevels={4}
              rootData={report.data.timeEntries}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
