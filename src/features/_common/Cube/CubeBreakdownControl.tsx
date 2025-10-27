/**
 * Cube Breakdown Control Component
 *
 * Provides dimension selector for breaking down children at the current zoom level.
 * Allows users to choose how to group and drill down into the data.
 */

import {
  useCubeContext,
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
import type { SortDirection } from "./CubeService.types.ts";

interface CubeBreakdownControlProps {
  title?: string;
}

export function CubeBreakdownControl({
  title = "Break down children by",
}: CubeBreakdownControlProps) {
  const { state } = useCubeContext();
  const dimensions = state.cube.config.dimensions;

  // Get the current level's breakdown dimension (what we're breaking down by)
  const currentLevelDimensionId = useCurrentBreakdownDimensionId();

  const currentLevelDimension = dimensions.find(
    (d) => d.id === currentLevelDimensionId,
  );

  // Filter out dimensions that are already used in the current path (they would only have 1 group)
  const availableDimensions = dimensions.filter((dim) => {
    return !state.path.some((pathItem) => pathItem.dimensionId === dim.id);
  });

  // Get current sort state for this level
  const currentPath = state.path
    .map((p) => `${p.dimensionId}:${p.dimensionValue}`)
    .join("|");
  const currentNodeState = state.cube.config.nodeStates.get(currentPath);
  const currentSortState = currentNodeState?.sortState;

  // Get measure-based sorting options - one per measure
  const measureSortOptions = state.cube.config.measures.map((measure) => ({
    id: `measure-${measure.id}`,
    label: measure.name,
    comparator: () => {
      // This will be handled by the cube service when sorting groups
      return 0;
    },
    defaultDirection: "desc" as const,
  }));

  const handleSortOptionChange = (sortOptionId: string) => {
    const newSortState = {
      ...currentSortState,
      sortOptionId,
    };
    state.setNodeSortState(state.path, newSortState);
  };

  const handleDirectionChange = (direction: SortDirection) => {
    const newSortState = {
      ...currentSortState,
      direction,
    };
    state.setNodeSortState(state.path, newSortState);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Break down selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Break down children by
          </label>
          <Select
            value={currentLevelDimension?.id ?? "raw-data"}
            onValueChange={(value) => {
              const dimensionValue = value === "raw-data" ? null : value;
              state.setNodeChildDimension(state.path, dimensionValue);
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder="Select dimension..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw-data" className="text-sm">
                <span className="mr-2">📊</span>
                Raw Data
              </SelectItem>
              {availableDimensions.map((dim) => (
                <SelectItem key={dim.id} value={dim.id} className="text-sm">
                  {dim.icon && <span className="mr-2">{dim.icon}</span>}
                  {dim.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sorting controls */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Sort by</label>
          <div className="flex items-center gap-2">
            <Select
              value={currentSortState?.sortOptionId || ""}
              onValueChange={(value) => handleSortOptionChange(value)}
            >
              <SelectTrigger className="h-9 flex-1 text-sm">
                <SelectValue placeholder="Select sort option..." />
              </SelectTrigger>
              <SelectContent>
                {/* Measure-based sorting options */}
                {measureSortOptions.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                      By Measurement
                    </div>
                    {measureSortOptions.map((option) => (
                      <SelectItem
                        key={option.id}
                        value={option.id}
                        className="text-sm pl-6"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* Dimension-based sorting options */}
                {currentLevelDimension?.sortOptions &&
                  currentLevelDimension.sortOptions.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 mt-1">
                        By Dimension
                      </div>
                      {currentLevelDimension.sortOptions.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={option.id}
                          className="text-sm pl-6"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </>
                  )}
              </SelectContent>
            </Select>

            {/* Direction toggle button */}
            <button
              onClick={() => {
                const currentDirection = currentSortState?.direction || "asc";
                handleDirectionChange(
                  currentDirection === "asc" ? "desc" : "asc",
                );
              }}
              className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
              title={`Sort ${(currentSortState?.direction || "asc") === "asc" ? "descending" : "ascending"}`}
            >
              <span className="text-sm">
                {(currentSortState?.direction || "asc") === "asc" ? "↑" : "↓"}
              </span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
