/**
 * Cube Dimension Explorer Component
 *
 * Displays dimension selector and interactive breakdown charts.
 * Shows measure selector, raw data breakdown, and dimension cards with drill-down capabilities.
 */

import {
  useCubeContext,
  useSelectedMeasure,
  useCurrentBreakdownDimensionId,
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
import type { DimensionDescriptor } from "./CubeService.types.ts";

interface CubeDimensionExplorerProps {
  className?: string;
}

interface DimensionChartProps {
  dimension: DimensionDescriptor<any, unknown>;
  items: any[];
  selectedMeasure: any;
  isActive?: boolean;
  onClick?: () => void;
  onGroupClick?: (groupItems: any[], dimensionValue: unknown) => void;
  icon?: string;
  title?: string;
  className?: string;
  interactive?: boolean;
}

function DimensionChart({
  dimension,
  items,
  selectedMeasure,
  isActive = false,
  onClick,
  onGroupClick,
  icon = "📊",
  title,
  className = "",
  interactive = true,
}: DimensionChartProps) {
  const dimensionGroups = new Map<string, any[]>();

  items.forEach((item) => {
    try {
      const value = dimension.getValue(item);
      let key: string;

      if (dimension.getKey) {
        key = dimension.getKey(value);
      } else if (typeof value === "string") {
        // Only treat as date for ISO-like strings (avoid numeric IDs like 197049993)
        const looksLikeIsoDate = /\d{4}-\d{2}-\d{2}/.test(value);
        if (looksLikeIsoDate) {
          const date = new Date(value);
          key = !isNaN(date.getTime())
            ? date.toISOString().split("T")[0]
            : String(value);
        } else {
          key = String(value);
        }
      } else if (typeof value === "number") {
        // Never interpret plain numbers as dates to avoid 1970-* artifacts
        key = String(value);
      } else {
        key = String(value ?? "null");
      }

      if (!dimensionGroups.has(key)) {
        dimensionGroups.set(key, []);
      }
      dimensionGroups.get(key)!.push(item);
    } catch {
      // Skip items with invalid values
    }
  });

  if (dimensionGroups.size === 0) return null;

  const totalValue = Array.from(dimensionGroups.values()).reduce(
    (sum, items) => {
      const groupTotal = items.reduce((groupSum, item) => {
        const value = selectedMeasure.getValue(item);
        return groupSum + (typeof value === "number" ? Math.abs(value) : 0);
      }, 0);
      return sum + groupTotal;
    },
    0,
  );

  const sortedGroups = Array.from(dimensionGroups.entries())
    .map(([key, items]) => {
      const groupTotal = items.reduce((sum, item) => {
        const value = selectedMeasure.getValue(item);
        return sum + (typeof value === "number" ? Math.abs(value) : 0);
      }, 0);
      return { key, items, total: groupTotal };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        "cursor-pointer hover:shadow-md",
        isActive ? "ring-2 ring-indigo-200 bg-indigo-50" : "hover:bg-slate-50",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span
              className={cn(isActive ? "text-indigo-700" : "text-slate-700")}
            >
              {title || dimension.name}
            </span>
          </div>
          {isActive && <Check className="h-4 w-4 text-indigo-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-slate-500 mb-2">
          {dimensionGroups.size} groups • {items.length} items
        </div>
        <div className="space-y-1">
          {sortedGroups.map(({ key, items, total }) => {
            const percentage = totalValue > 0 ? (total / totalValue) * 100 : 0;
            const formattedValue = selectedMeasure.formatValue
              ? selectedMeasure.formatValue(total)
              : String(total);

            let displayValue;
            if (dimension.formatValue) {
              try {
                displayValue = dimension.formatValue(key);
              } catch {
                displayValue = key;
              }
            } else {
              // Try to format as date if it looks like a date
              try {
                const dateObj = new Date(key);
                if (!isNaN(dateObj.getTime())) {
                  displayValue = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                } else {
                  displayValue = key;
                }
              } catch {
                displayValue = key;
              }
            }

            return (
              <div
                key={key}
                className={cn(
                  "space-y-1",
                  interactive && "group cursor-pointer",
                )}
                onClick={
                  interactive
                    ? (e) => {
                        e.stopPropagation();
                        if (onGroupClick) {
                          const firstItem = items[0];
                          const dimensionValue = dimension.getValue(firstItem);
                          onGroupClick(items, dimensionValue);
                        }
                      }
                    : (e) => {
                        // Prevent group clicks when not interactive, but don't stop propagation
                        // so the card click still works
                        e.stopPropagation();
                      }
                }
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "truncate flex-1 min-w-0 transition-all",
                      interactive && "group-hover:font-medium",
                    )}
                  >
                    {displayValue} ({items.length} entries)
                  </span>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <span className="text-slate-500">{formattedValue}</span>
                    {interactive && (
                      <ZoomIn className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-indigo-400 to-indigo-600"
                        : interactive
                          ? "bg-gradient-to-r from-slate-400 to-slate-600 group-hover:from-indigo-500 group-hover:to-indigo-700"
                          : "bg-gradient-to-r from-slate-400 to-slate-600",
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {dimensionGroups.size > 5 && (
          <div className="text-xs text-slate-400 pt-1">
            +{dimensionGroups.size - 5} more
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  const currentBreakdownDimensionId = useCurrentBreakdownDimensionId();

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
      <DimensionChart
        dimension={state.rawDataDimension}
        items={currentItems}
        selectedMeasure={selectedMeasure}
        isActive={currentBreakdownDimensionId === null}
        onClick={() => {
          // Set raw data as the breakdown (null dimension)
          state.setNodeChildDimension(state.path, null);
        }}
        icon="📊"
        title="Raw Data"
        interactive={false}
      />

      {/* Interactive Dimension Cards - All dimensions at current level */}
      {sidebarDimensions.map((dimension) => {
        const isActive = currentBreakdownDimensionId === dimension.id;

        return (
          <DimensionChart
            key={dimension.id}
            dimension={dimension}
            items={currentItems}
            selectedMeasure={selectedMeasure}
            isActive={isActive}
            onClick={() => {
              // Handle dimension selection - set as breakdown dimension
              state.setNodeChildDimension(state.path, dimension.id);
            }}
            onGroupClick={(_, dimensionValue) => {
              // Handle zoom into this specific group
              const newPath = [
                ...state.path,
                {
                  dimensionId: dimension.id,
                  dimensionValue,
                },
              ];
              state.setZoomPath(newPath);
            }}
            icon={dimension.icon}
          />
        );
      })}
    </div>
  );
}
