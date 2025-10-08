/**
 * Debug Panel for Cube State
 * Temporary component to visualize cube state during development
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import type { CubeState } from "./useCubeState.ts";
import type { CubeGroup } from "./CubeService.types.ts";

interface CubeDebugPanelProps {
  state: CubeState;
  displayGroups: CubeGroup[];
}

export function CubeDebugPanel({ state, displayGroups }: CubeDebugPanelProps) {
  return (
    <Card className="mb-4 bg-slate-50">
      <CardHeader>
        <CardTitle className="text-sm">🐛 Debug: Cube State</CardTitle>
      </CardHeader>
      <CardContent>
        <details className="text-xs">
          <summary className="cursor-pointer font-medium mb-2">
            Click to expand state
          </summary>
          <div className="flex gap-4 overflow-x-auto">
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium mb-1">Path:</div>
              <pre className="bg-white p-2 rounded overflow-auto max-h-60 text-[10px]">
                {JSON.stringify(state.path, null, 2)}
              </pre>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium mb-1 text-blue-700">
                User Overrides (state only):
              </div>
              <pre className="bg-white p-2 rounded overflow-auto max-h-60 text-[10px]">
                {state.nodeStates.size === 0
                  ? "{}  // No overrides yet"
                  : JSON.stringify(
                      Object.fromEntries(state.nodeStates),
                      null,
                      2,
                    )}
              </pre>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium mb-1 text-green-700">
                Final BreakdownMap (config + overrides):
              </div>
              <pre className="bg-white p-2 rounded overflow-auto max-h-60 text-[10px]">
                {JSON.stringify(state.cube.config.breakdownMap, null, 2)}
              </pre>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium mb-1">Display Groups:</div>
              <pre className="bg-white p-2 rounded overflow-auto max-h-60 text-[10px]">
                {JSON.stringify(
                  displayGroups.map((g) => ({
                    dimensionId: g.dimensionId,
                    dimensionKey: g.dimensionKey,
                    dimensionLabel: g.dimensionLabel,
                    childDimensionId: g.childDimensionId,
                    itemCount: g.itemCount,
                    hasSubGroups: !!g.subGroups,
                    hasItems: !!g.items,
                  })),
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
