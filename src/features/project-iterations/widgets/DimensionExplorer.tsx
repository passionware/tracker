/**
 * Dimension Explorer Component
 *
 * Displays dimension selector and breakdown charts using shared cube context.
 * Can be used independently in dashboard layouts.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useState } from "react";

interface DimensionExplorerProps extends WithFrontServices {
  report: GeneratedReportSource;
}

export function DimensionExplorer({}: DimensionExplorerProps) {
  const { state, dimensions, measures } = useCubeContext();
  const [selectedMeasureId, setSelectedMeasureId] = useState(measures[0]?.id);

  const selectedMeasure =
    measures.find((m) => m.id === selectedMeasureId) || measures[0];
  const cube = state.cube;

  // Determine which dimensions to show in sidebar (same rule as CubeView)
  const usedDimensionIds = state.path.map((p) => p.dimensionId);
  const sidebarDimensions = dimensions.filter(
    (d) => !usedDimensionIds.includes(d.id),
  );

  const currentChildDimensionId =
    cube.config.breakdownMap?.[
      state.path
        .map(
          (p) =>
            `${p.dimensionId}:${dimensions.find((d) => d.id === p.dimensionId)?.getKey?.(p.dimensionValue) || p.dimensionValue}`,
        )
        .join("|") || ""
    ];

  return (
    <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Measure Selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Measure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedMeasureId}
              onValueChange={setSelectedMeasureId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose measure..." />
              </SelectTrigger>
              <SelectContent>
                {measures.map((measure) => (
                  <SelectItem key={measure.id} value={measure.id}>
                    {measure.icon && (
                      <span className="mr-1">{measure.icon}</span>
                    )}
                    {measure.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Dimension Selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Break down children by
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={currentChildDimensionId ?? "raw-data"}
              onValueChange={(value) => {
                const dimensionValue = value === "raw-data" ? null : value;
                state.setNodeChildDimension(state.path, dimensionValue);
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Select dimension..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw-data" className="text-xs">
                  <span className="mr-2">📊</span>
                  Raw Data
                </SelectItem>
                {sidebarDimensions.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id} className="text-xs">
                    {dim.icon && <span className="mr-2">{dim.icon}</span>}
                    {dim.name}
                  </SelectItem>
                ))}
                {currentChildDimensionId &&
                  !sidebarDimensions.some(
                    (d) => d.id === currentChildDimensionId,
                  ) && (
                    <SelectItem
                      value={currentChildDimensionId}
                      className="text-xs"
                    >
                      {dimensions.find((d) => d.id === currentChildDimensionId)
                        ?.icon && (
                        <span className="mr-2">
                          {
                            dimensions.find(
                              (d) => d.id === currentChildDimensionId,
                            )?.icon
                          }
                        </span>
                      )}
                      {
                        dimensions.find((d) => d.id === currentChildDimensionId)
                          ?.name
                      }
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Dimensional Breakdown Charts */}
        {sidebarDimensions.map((dimension) => {
          const groups = cube.groups.filter(
            (g) => g.dimensionId === dimension.id,
          );
          if (groups.length === 0) return null;

          const totalValue = groups.reduce((sum, group) => {
            const cell = group.cells.find(
              (c) => c.measureId === selectedMeasure.id,
            );
            return (
              sum + (typeof cell?.value === "number" ? Math.abs(cell.value) : 0)
            );
          }, 0);

          return (
            <Card key={dimension.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  {dimension.icon && <span>{dimension.icon}</span>}
                  {dimension.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groups
                  .sort((a, b) => {
                    const aValue =
                      a.cells.find((c) => c.measureId === selectedMeasure.id)
                        ?.value ?? 0;
                    const bValue =
                      b.cells.find((c) => c.measureId === selectedMeasure.id)
                        ?.value ?? 0;
                    return Math.abs(Number(bValue)) - Math.abs(Number(aValue));
                  })
                  .slice(0, 8)
                  .map((group) => {
                    const cell = group.cells.find(
                      (c) => c.measureId === selectedMeasure.id,
                    );
                    const value =
                      typeof cell?.value === "number"
                        ? Math.abs(cell.value)
                        : 0;
                    const percentage =
                      totalValue > 0 ? (value / totalValue) * 100 : 0;
                    const formattedValue =
                      cell?.formattedValue ?? String(value);

                    return (
                      <div key={group.dimensionKey} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1 min-w-0">
                            {group.dimensionLabel}
                          </span>
                          <span className="text-slate-500 ml-2 shrink-0">
                            {formattedValue}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
