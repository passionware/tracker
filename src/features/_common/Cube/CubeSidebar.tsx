/**
 * Cube Sidebar Component
 *
 * Shows summary statistics and dimensional breakdowns
 */

import {
  Card,
  CardContent,
  CardDescription,
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
import { ZoomIn } from "lucide-react";
import { useState } from "react";
import type { BreadcrumbItem } from "./CubeNavigation.tsx";
import type {
  CubeDataItem,
  CubeGroup,
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import { CubeSunburst } from "./CubeSunburst.tsx";
import type { CubeState } from "./useCubeState.ts";

interface CubeSidebarProps {
  state: CubeState;
  zoomPath: BreadcrumbItem[];
  measures: MeasureDescriptor<any>[];
  sidebarDimensions: DimensionDescriptor<any>[];
  currentGroupDimensionId?: string;
  currentChildDimensionId?: string | null;
  handleZoomIn: (group: CubeGroup, fullPath: BreadcrumbItem[]) => void;
}

export function CubeSidebar({
  state,
  zoomPath,
  measures,
  sidebarDimensions,
  currentGroupDimensionId,
  currentChildDimensionId,
  handleZoomIn,
}: CubeSidebarProps) {
  const cube = state.cube;
  const config = cube.config;

  // State for selected measure for dimensional breakdowns
  const [selectedMeasureId, setSelectedMeasureId] = useState<string>(
    measures[0]?.id || "",
  );

  return (
    <div className="w-80 flex-shrink-0 overflow-y-auto">
      <Card className="">
        <CardHeader>
          <CardTitle className="text-base">
            {zoomPath.length === 0 ? "Summary" : "Summary"}
          </CardTitle>
          <CardDescription className="text-xs">
            {zoomPath.length === 0 ? (
              <>{cube.totalItems} items</>
            ) : (
              <>
                {cube.totalItems} items in{" "}
                {zoomPath[zoomPath.length - 1].dimensionId}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cube.grandTotals.map((cell, _idx, arr) => {
              const measure = measures.find((m) => m.id === cell.measureId);

              // Calculate percentage of total for visual bar
              const numValue = typeof cell.value === "number" ? cell.value : 0;
              const maxValue = Math.max(
                ...arr.map((c) => (typeof c.value === "number" ? c.value : 0)),
              );
              const percentage = maxValue > 0 ? (numValue / maxValue) * 100 : 0;

              return (
                <div key={cell.measureId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      {measure?.icon && <span>{measure.icon}</span>}
                      <span>{measure?.name || cell.measureId}</span>
                    </div>
                    {arr.length > 1 && (
                      <div className="text-xs text-slate-400">
                        {percentage.toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-lg">
                    {cell.formattedValue}
                  </div>
                  {/* Visual progress bar */}
                  {arr.length > 1 && typeof cell.value === "number" && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sunburst Chart - Hierarchical Breakdown */}
            {selectedMeasureId &&
              (() => {
                const selectedMeasure =
                  measures.find((m) => m.id === selectedMeasureId) ||
                  measures[0];

                return (
                  <div className="pt-4 border-t">
                    <CubeSunburst
                      state={state}
                      measure={selectedMeasure}
                      dimensions={
                        config.dimensions as DimensionDescriptor<
                          CubeDataItem,
                          unknown
                        >[]
                      }
                      maxLevels={4}
                      rootData={config.data}
                    />
                  </div>
                );
              })()}

            {/* Multi-dimensional breakdowns */}
            {sidebarDimensions.length > 0 &&
              (() => {
                // Get current data items (either root or zoomed filtered data)
                const currentItems =
                  zoomPath.length === 0 ? config.data : cube.filteredData || [];

                if (!currentItems.length) return null;

                // Get the selected measure
                const selectedMeasure =
                  measures.find((m) => m.id === selectedMeasureId) ||
                  measures[0];

                // Calculate breakdowns for all available dimensions
                return (
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-slate-600">
                        Explore data
                      </div>
                      <Select
                        value={selectedMeasureId}
                        onValueChange={setSelectedMeasureId}
                      >
                        <SelectTrigger className="h-6 w-[140px] text-[11px]">
                          <SelectValue placeholder="Choose measure..." />
                        </SelectTrigger>
                        <SelectContent>
                          {measures.map((measure) => (
                            <SelectItem
                              key={measure.id}
                              value={measure.id}
                              className="text-xs"
                            >
                              {measure.icon && (
                                <span className="mr-1">{measure.icon}</span>
                              )}
                              {measure.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {sidebarDimensions.map((dimension) => {
                      // Group items by this dimension
                      const grouped = new Map<string, typeof currentItems>();
                      currentItems.forEach((item: CubeDataItem) => {
                        const value = dimension.getValue(item);
                        const key = dimension.getKey
                          ? dimension.getKey(value)
                          : String(value ?? "null");
                        if (!grouped.has(key)) {
                          grouped.set(key, []);
                        }
                        grouped.get(key)!.push(item);
                      });

                      // Sort by size and take top 5
                      const sortedGroups = Array.from(grouped.entries())
                        .map(([key, items]) => {
                          const value = dimension.getValue(items[0]);
                          const label = dimension.formatValue
                            ? dimension.formatValue(value)
                            : String(value);

                          // Calculate measure value (use selected measure)
                          const measureValues = items.map(
                            (item: CubeDataItem) =>
                              selectedMeasure.getValue(item),
                          );
                          const aggregatedValue =
                            selectedMeasure.aggregate(measureValues);
                          const numValue =
                            typeof aggregatedValue === "number"
                              ? aggregatedValue
                              : 0;

                          return { key, label, items, numValue };
                        })
                        .sort((a, b) => b.numValue - a.numValue);

                      const totalValue = sortedGroups.reduce(
                        (sum, g) => sum + g.numValue,
                        0,
                      );
                      const topGroups = sortedGroups.slice(0, 5);

                      // Sidebar visualization mode comes from measure definition
                      const sidebarMode =
                        selectedMeasure.sidebarOptions?.mode || "percentage";
                      const isProfit = sidebarMode === "divergent";
                      const maxAbs = isProfit
                        ? Math.max(
                            0,
                            ...sortedGroups.map((g) => Math.abs(g.numValue)),
                          )
                        : 0;

                      // Check if this is the child dimension (what will be used for breakdown)
                      const isChildDimension =
                        currentChildDimensionId === dimension.id;

                      // Check if this is the currently displayed dimension (what we're viewing now)
                      const isDisplayedDimension =
                        currentGroupDimensionId === dimension.id;

                      return (
                        <div
                          key={dimension.id}
                          className={cn(
                            "space-y-2 p-2 rounded-lg transition-all cursor-pointer",
                            isChildDimension
                              ? "bg-indigo-50 ring-2 ring-indigo-200"
                              : isDisplayedDimension
                                ? "bg-blue-50 ring-2 ring-blue-300"
                                : "hover:bg-slate-50",
                          )}
                          onClick={() => {
                            // Set this dimension as the breakdown for current level's children
                            state.setNodeChildDimension(
                              state.path,
                              dimension.id,
                            );
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            {dimension.icon && (
                              <span className="text-xs">{dimension.icon}</span>
                            )}
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isChildDimension
                                  ? "text-indigo-700"
                                  : isDisplayedDimension
                                    ? "text-blue-700"
                                    : "text-slate-700",
                              )}
                            >
                              {dimension.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({grouped.size})
                            </span>
                            {isChildDimension && (
                              <span
                                className="ml-auto text-indigo-600"
                                title="Child dimension"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                            {isDisplayedDimension && (
                              <span
                                className="ml-auto text-blue-600"
                                title="Currently viewing"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path
                                    fillRule="evenodd"
                                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            {topGroups.map((group) => {
                              const pct =
                                totalValue > 0
                                  ? (group.numValue / totalValue) * 100
                                  : 0;
                              const formattedValue = selectedMeasure.formatValue
                                ? selectedMeasure.formatValue(group.numValue)
                                : String(group.numValue);

                              return (
                                <div
                                  key={group.key}
                                  className="space-y-0.5 group/item p-1 -mx-1 rounded transition-colors"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-600 truncate max-w-[120px]">
                                      {group.label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400">
                                        {sidebarMode === "percentage" &&
                                          `${pct.toFixed(0)}%`}
                                        {sidebarMode !== "percentage" &&
                                          formattedValue}
                                      </span>
                                      <button
                                        className="p-0.5 hover:bg-indigo-100 rounded transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();

                                          // Calculate cells for all active measures
                                          const cells = measures.map(
                                            (measure) => {
                                              const values = group.items.map(
                                                measure.getValue,
                                              );
                                              const value =
                                                measure.aggregate(values);
                                              return {
                                                measureId: measure.id,
                                                value,
                                                formattedValue:
                                                  measure.formatValue
                                                    ? measure.formatValue(value)
                                                    : String(value),
                                              };
                                            },
                                          );

                                          // Build the breadcrumb for this specific group
                                          const breadcrumbItem: BreadcrumbItem =
                                            {
                                              dimensionId: dimension.id,
                                              dimensionKey: group.key,
                                            };

                                          // Build the actual CubeGroup for this synthetic group
                                          const syntheticGroup: CubeGroup = {
                                            dimensionId: dimension.id,
                                            dimensionValue: dimension.getValue(
                                              group.items[0],
                                            ),
                                            dimensionKey: group.key,
                                            dimensionLabel: group.label,
                                            itemCount: group.items.length,
                                            cells,
                                            items: group.items,
                                          };

                                          // Pin (zoom into) this group
                                          // If this is a different dimension than currently displayed,
                                          // start a fresh path from root
                                          const fullPath =
                                            dimension.id ===
                                            currentGroupDimensionId
                                              ? // Same dimension - append to current path
                                                [...zoomPath, breadcrumbItem]
                                              : // Different dimension - start fresh from root
                                                [breadcrumbItem];
                                          handleZoomIn(
                                            syntheticGroup,
                                            fullPath,
                                          );
                                        }}
                                        title="Pin this group"
                                      >
                                        <ZoomIn className="w-3 h-3 text-slate-500 hover:text-indigo-700" />
                                      </button>
                                    </div>
                                  </div>
                                  {sidebarMode === "divergent" ? (
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 flex items-center ">
                                      {/* Left (negative) side */}
                                      <div className="h-1.5 flex-1 relative">
                                        {group.numValue < 0 && maxAbs > 0 && (
                                          <div
                                            className={cn(
                                              "absolute right-0 top-0 h-1.5",
                                              selectedMeasure.sidebarOptions
                                                ?.negativeColorClassName ||
                                                "bg-rose-500",
                                            )}
                                            style={{
                                              width: `${(Math.abs(group.numValue) / maxAbs) * 100}%`,
                                            }}
                                          />
                                        )}
                                      </div>
                                      {/* Zero baseline */}
                                      <div className="w-0.5 h-2 bg-slate-300" />
                                      {/* Right (positive) side */}
                                      <div className="h-1.5 flex-1 relative">
                                        {group.numValue > 0 && maxAbs > 0 && (
                                          <div
                                            className={cn(
                                              "absolute left-0 top-0 h-1.5",
                                              selectedMeasure.sidebarOptions
                                                ?.positiveColorClassName ||
                                                "bg-emerald-500",
                                            )}
                                            style={{
                                              width: `${(group.numValue / maxAbs) * 100}%`,
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 flex items-center">
                                      <div
                                        className={cn(
                                          "h-1 rounded-full transition-all duration-500",
                                          isChildDimension
                                            ? "bg-gradient-to-r from-indigo-400 to-indigo-600"
                                            : isDisplayedDimension
                                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                              : "bg-gradient-to-r from-slate-400 to-slate-600",
                                        )}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {grouped.size > 5 && (
                              <div className="text-[10px] text-slate-400 text-right pt-0.5">
                                +{grouped.size - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
