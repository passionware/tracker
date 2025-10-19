/**
 * Cube Dimension Explorer Component
 *
 * Displays dimension selector and interactive breakdown charts.
 * Shows measure selector, raw data breakdown, and dimension cards with drill-down capabilities.
 */

import {
  useCubeContext,
  useSelectedMeasure,
} from "@/features/_common/Cube/CubeContext.tsx";
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
import { cn } from "@/lib/utils.ts";
import { ZoomIn, Check } from "lucide-react";

interface CubeDimensionExplorerProps {
  className?: string;
}

export function CubeDimensionExplorer({
  className = "",
}: CubeDimensionExplorerProps) {
  const { state } = useCubeContext();
  const dimensions = state.cube.config.dimensions;
  const { selectedMeasureId, setSelectedMeasureId, selectedMeasure } =
    useSelectedMeasure();
  const cube = state.cube;

  // Get current zoom level data - this is what's shown in breadcrumbs
  const currentItems =
    state.path.length === 0 ? state.cube.config.data : cube.filteredData || [];

  // Filter out dimensions that are already used in the current path (they would only have 1 group)
  const sidebarDimensions = dimensions.filter((dim) => {
    return !state.path.some((pathItem) => pathItem.dimensionId === dim.id);
  });

  // Get current breakdown dimension ID for highlighting
  const currentBreakdownDimensionId =
    state.cube.config.breakdownMap?.[
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

  return (
    <div className={`p-4 space-y-4 ${className}`}>
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
              {state.cube.config.measures.map((measure) => (
                <SelectItem key={measure.id} value={measure.id}>
                  {measure.icon && <span className="mr-1">{measure.icon}</span>}
                  {measure.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Raw Data Chart */}
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          currentBreakdownDimensionId === null
            ? "ring-2 ring-indigo-200 bg-indigo-50"
            : "hover:bg-slate-50",
        )}
        onClick={() => {
          // Set raw data as the breakdown (null dimension)
          state.setNodeChildDimension(state.path, null);
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📊</span>
              <span className="text-slate-700">Raw Data</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-slate-500 mb-2">
            {currentItems.length} entries
          </div>
          <div className="space-y-1">
            {/* Time-based breakdown for raw data */}
            {(() => {
              // Group entries by date (daily breakdown)
              const dateGroups = new Map<string, any[]>();
              currentItems.forEach((item) => {
                const date = new Date(item.startAt).toISOString().split("T")[0];
                if (!dateGroups.has(date)) {
                  dateGroups.set(date, []);
                }
                dateGroups.get(date)!.push(item);
              });

              const sortedDates = Array.from(dateGroups.entries())
                .sort(
                  ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
                )
                .slice(0, 5); // Show top 5 days

              const totalValue = currentItems.reduce((sum, item) => {
                const value = selectedMeasure.getValue(item);
                return sum + (typeof value === "number" ? Math.abs(value) : 0);
              }, 0);

              return sortedDates.map(([date, items]) => {
                const dayValue = items.reduce((sum, item) => {
                  const value = selectedMeasure.getValue(item);
                  return (
                    sum + (typeof value === "number" ? Math.abs(value) : 0)
                  );
                }, 0);

                const percentage =
                  totalValue > 0 ? (dayValue / totalValue) * 100 : 0;
                const formattedValue = selectedMeasure.formatValue
                  ? selectedMeasure.formatValue(dayValue)
                  : String(dayValue);

                const displayDate = new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div key={date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1 min-w-0">
                        {displayDate} ({items.length} entries)
                      </span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <span className="text-slate-500">{formattedValue}</span>
                        <ZoomIn className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
            {currentItems.length > 0 && (
              <div className="text-xs text-slate-400 pt-1">Daily breakdown</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Dimension Cards - All dimensions at current level */}
      {sidebarDimensions.map((dimension) => {
        // Calculate breakdown from current zoom level data
        const dimensionGroups = new Map<string, any[]>();

        currentItems.forEach((item) => {
          const value = dimension.getValue(item);
          const key = dimension.getKey
            ? dimension.getKey(value)
            : String(value ?? "null");

          if (!dimensionGroups.has(key)) {
            dimensionGroups.set(key, []);
          }
          dimensionGroups.get(key)!.push(item);
        });

        if (dimensionGroups.size === 0) return null;

        const totalValue = Array.from(dimensionGroups.values()).reduce(
          (sum, items) => {
            const groupTotal = items.reduce((groupSum, item) => {
              const value = selectedMeasure.getValue(item);
              return (
                groupSum + (typeof value === "number" ? Math.abs(value) : 0)
              );
            }, 0);
            return sum + groupTotal;
          },
          0,
        );

        // Check if this dimension is the current breakdown dimension (same as "breakdown children by")
        const isActive = currentBreakdownDimensionId === dimension.id;

        return (
          <Card
            key={dimension.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              isActive
                ? "ring-2 ring-indigo-200 bg-indigo-50"
                : "hover:bg-slate-50",
            )}
            onClick={() => {
              // Handle dimension selection - set as breakdown dimension
              state.setNodeChildDimension(state.path, dimension.id);
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dimension.icon && <span>{dimension.icon}</span>}
                  <span
                    className={cn(
                      isActive ? "text-indigo-700" : "text-slate-700",
                    )}
                  >
                    {dimension.name}
                  </span>
                </div>
                {isActive && <Check className="h-4 w-4 text-indigo-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-slate-500 mb-2">
                {dimensionGroups.size} groups
              </div>
              {Array.from(dimensionGroups.entries())
                .map(([key, items]) => {
                  const groupTotal = items.reduce((sum, item) => {
                    const value = selectedMeasure.getValue(item);
                    return (
                      sum + (typeof value === "number" ? Math.abs(value) : 0)
                    );
                  }, 0);

                  const percentage =
                    totalValue > 0 ? (groupTotal / totalValue) * 100 : 0;
                  const formattedValue = selectedMeasure.formatValue
                    ? selectedMeasure.formatValue(groupTotal)
                    : String(groupTotal);

                  // Get the display label for this group
                  const firstItem = items[0];
                  const value = dimension.getValue(firstItem);
                  const displayLabel = dimension.formatValue
                    ? dimension.formatValue(value)
                    : String(value ?? "Unknown");

                  return {
                    key,
                    items,
                    groupTotal,
                    percentage,
                    formattedValue,
                    displayLabel,
                  };
                })
                .sort((a, b) => Math.abs(b.groupTotal) - Math.abs(a.groupTotal))
                .slice(0, 5)
                .map((group) => (
                  <div
                    key={group.key}
                    className="space-y-1 group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle zoom into this specific group
                      const newPath = [
                        ...state.path,
                        {
                          dimensionId: dimension.id,
                          dimensionValue: dimension.getValue(group.items[0]),
                        },
                      ];
                      state.setZoomPath(newPath);
                    }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1 min-w-0 group-hover:font-medium transition-all">
                        {group.displayLabel}
                      </span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <span className="text-slate-500">
                          {group.formattedValue}
                        </span>
                        <ZoomIn className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-indigo-400 to-indigo-600"
                            : "bg-gradient-to-r from-slate-400 to-slate-600 group-hover:from-indigo-500 group-hover:to-indigo-700",
                        )}
                        style={{ width: `${group.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              {dimensionGroups.size > 5 && (
                <div className="text-xs text-slate-400 pt-1">
                  +{dimensionGroups.size - 5} more
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
