/**
 * Cube Breakdown Control Component
 *
 * Provides dimension selector for breaking down children at the current zoom level.
 * Allows users to choose how to group and drill down into the data.
 */

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

interface CubeBreakdownControlProps {
  title?: string;
}

export function CubeBreakdownControl({
  title = "Break down children by",
}: CubeBreakdownControlProps) {
  const { state } = useCubeContext();
  const dimensions = state.cube.config.dimensions;
  const cube = state.cube;

  // Get the current level's breakdown dimension (what we're breaking down by)
  const currentLevelDimensionId = (() => {
    const pathKey =
      state.path
        .map((p) => {
          const dim = dimensions.find((d) => d.id === p.dimensionId);
          const key = dim?.getKey
            ? dim.getKey(p.dimensionValue)
            : String(p.dimensionValue ?? "null");
          return `${p.dimensionId}:${key}`;
        })
        .join("|") || "";

    const breakdownId = cube.config.breakdownMap?.[pathKey];

    // Debug logging
    console.log("CubeBreakdownControl Debug:", {
      path: state.path,
      pathKey,
      breakdownMap: cube.config.breakdownMap,
      breakdownId,
    });

    return breakdownId;
  })();

  const currentLevelDimension = dimensions.find(
    (d) => d.id === currentLevelDimensionId,
  );

  // Filter out dimensions that are already used in the current path (they would only have 1 group)
  const availableDimensions = dimensions.filter((dim) => {
    return !state.path.some((pathItem) => pathItem.dimensionId === dim.id);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {title}
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
  );
}
