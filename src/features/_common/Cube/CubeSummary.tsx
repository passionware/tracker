/**
 * Cube Summary Component
 *
 * Displays summary statistics for the current zoom level or all data.
 * Shows measures with their calculated totals and formatted values.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowUp } from "lucide-react";

interface CubeSummaryProps {
  report: GeneratedReportSource;
  showNavigation?: boolean;
}

export function CubeSummary({
  report,
  showNavigation = true,
}: CubeSummaryProps) {
  const { state, measures } = useCubeContext();
  const cube = state.cube;

  // Get current zoom level data - this is what's shown in breadcrumbs
  const currentItems =
    state.path.length === 0 ? report.data.timeEntries : cube.filteredData || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700">
            Summary {state.path.length > 0 ? "(Current Level)" : "(All Data)"}
          </CardTitle>
          {showNavigation && state.path.length > 0 && (
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
            <div key={measure.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {measure.icon && (
                  <span className="text-sm">{measure.icon}</span>
                )}
                <span className="text-sm text-slate-600">{measure.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formattedValue}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
