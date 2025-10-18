/**
 * Summary Sidebar Component
 *
 * Displays summary statistics and sunburst chart using shared cube context.
 * Can be used independently in dashboard layouts.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import { CubeSunburst } from "@/features/_common/Cube/CubeSunburst.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

interface SummarySidebarProps {
  report: GeneratedReportSource;
}

export function SummarySidebar({ report }: SummarySidebarProps) {
  const { state, measures, dimensions } = useCubeContext();
  const selectedMeasure = measures[0];
  const cube = state.cube;

  // State for sunburst view mode
  const [showAllLevels, setShowAllLevels] = useState(false);

  // Get current zoom level data - this is what's shown in breadcrumbs
  const currentItems =
    state.path.length === 0 ? report.data.timeEntries : cube.filteredData || [];

  // Get the current level's breakdown dimension (what we're breaking down by)
  const currentLevelDimensionId =
    cube.config.breakdownMap?.[
      state.path
        .map((p) => {
          const dim = dimensions.find((d) => d.id === p.dimensionId);
          const key = dim?.getKey
            ? dim.getKey(p.dimensionValue)
            : String(p.dimensionValue ?? "null");
          return `${p.dimensionId}:${key}`;
        })
        .join("|") || ""
    ];

  const currentLevelDimension = dimensions.find(
    (d) => d.id === currentLevelDimensionId,
  );

  // Filter out dimensions that are already used in the current path (they would only have 1 group)
  const availableDimensions = dimensions.filter((dim) => {
    return !state.path.some((pathItem) => pathItem.dimensionId === dim.id);
  });

  return (
    <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
      <div className="p-4 space-y-4 flex-1">
        {/* Summary Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">
                Summary{" "}
                {state.path.length > 0 ? "(Current Level)" : "(All Data)"}
              </CardTitle>
              {state.path.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Go to parent by removing the last path item
                    const parentPath = state.path.slice(0, -1);
                    state.setZoomPath(parentPath);
                  }}
                  className="h-6 w-6 p-0"
                  title="Go to parent"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {measures.map((measure) => {
              // Calculate totals from current zoom level data
              const totalValue = currentItems.reduce((sum, item) => {
                const value = measure.getValue(item);
                return sum + (typeof value === "number" ? value : 0);
              }, 0);

              const formattedValue = measure.formatValue
                ? measure.formatValue(totalValue)
                : String(totalValue);

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

        {/* Break down children by - Dimension Selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Break down children by
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={currentLevelDimension?.id ?? "raw-data"}
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
                {availableDimensions.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id} className="text-xs">
                    {dim.icon && <span className="mr-2">{dim.icon}</span>}
                    {dim.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Sunburst Chart - always visible, shows hierarchy from current zoom or root */}
      <div className="p-4 pt-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Hierarchical Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* View Mode Switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="sunburst-mode" className="text-xs text-slate-600">
                {showAllLevels ? "From root" : "From current zoom"}
              </Label>
              <Switch
                id="sunburst-mode"
                checked={showAllLevels}
                onCheckedChange={setShowAllLevels}
              />
            </div>

            {/* Sunburst Chart */}
            <CubeSunburst
              state={state}
              measure={selectedMeasure}
              dimensions={dimensions}
              maxLevels={4}
              rootData={showAllLevels ? report.data.timeEntries : currentItems}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
