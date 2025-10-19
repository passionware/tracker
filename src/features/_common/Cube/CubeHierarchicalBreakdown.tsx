/**
 * Cube Hierarchical Breakdown Component
 *
 * Displays a sunburst chart with view mode controls for hierarchical data visualization.
 * Allows switching between "from root" and "from current zoom" views.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import {
  useCubeContext,
  useSelectedMeasure,
} from "@/features/_common/Cube/CubeContext.tsx";
import { CubeSunburst } from "@/features/_common/Cube/CubeSunburst.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useState } from "react";

interface CubeHierarchicalBreakdownProps {
  report: GeneratedReportSource;
  title?: string;
  maxLevels?: number;
  showViewModeToggle?: boolean;
}

export function CubeHierarchicalBreakdown({
  report,
  title = "Hierarchical Breakdown",
  maxLevels = 4,
  showViewModeToggle = true,
}: CubeHierarchicalBreakdownProps) {
  const { state } = useCubeContext();
  const dimensions = state.cube.config.dimensions;
  const { selectedMeasure } = useSelectedMeasure();
  const cube = state.cube;

  // State for sunburst view mode
  const [showAllLevels, setShowAllLevels] = useState(false);

  // Get current zoom level data - this is what's shown in breadcrumbs
  const currentItems =
    state.path.length === 0 ? report.data.timeEntries : cube.filteredData || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* View Mode Switch */}
        {showViewModeToggle && (
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
        )}

        {/* Sunburst Chart */}
        <CubeSunburst
          state={state}
          measure={selectedMeasure}
          dimensions={dimensions}
          maxLevels={maxLevels}
          rootData={showAllLevels ? report.data.timeEntries : currentItems}
        />
      </CardContent>
    </Card>
  );
}
