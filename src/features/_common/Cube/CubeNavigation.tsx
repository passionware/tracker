/**
 * Cube Navigation Component
 *
 * Breadcrumbs and dimension picker for navigating the cube hierarchy
 */

import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { DimensionDescriptor, CubeGroup } from "./CubeService.types.ts";
import type { CubeState } from "./useCubeState.ts";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";

export interface BreadcrumbItem {
  dimensionId: string;
  dimensionKey: string;
}

interface CubeNavigationProps {
  state: CubeState;
  zoomPath: BreadcrumbItem[];
  dimensions: DimensionDescriptor<any>[];
  currentChildDimensionId?: string | null;
  dropdownDimensions: DimensionDescriptor<any>[];
  enableDimensionPicker: boolean;
  findGroupByPath: (breadcrumbs: BreadcrumbItem[]) => CubeGroup | undefined;
}

export function CubeNavigation({
  state,
  zoomPath,
  dimensions,
  currentChildDimensionId,
  dropdownDimensions,
  enableDimensionPicker,
  findGroupByPath,
}: CubeNavigationProps) {
  const handleBreadcrumbClick = (index: number) => {
    state.navigateToLevel(index);
  };

  return (
    <motion.div
      className="mb-4 p-3 bg-slate-50 rounded-lg border"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleBreadcrumbClick(-1)}
          >
            <Home className="w-3 h-3 mr-1" />
            Root
          </Button>
          {zoomPath.map((breadcrumb, index) => {
            const dimension = dimensions.find(
              (d) => d.id === breadcrumb.dimensionId,
            );
            // Derive the label from the group in the cube
            const group = findGroupByPath(zoomPath.slice(0, index + 1));
            const label = group?.dimensionLabel || breadcrumb.dimensionKey;

            return (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <Button
                  variant={
                    index === zoomPath.length - 1 ? "secondary" : "ghost"
                  }
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {dimension?.icon && (
                    <span className="mr-1">{dimension.icon}</span>
                  )}
                  <span className="text-slate-500 font-normal">
                    {dimension?.name || breadcrumb.dimensionId}:
                  </span>
                  <span className="ml-1">{label}</span>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Dimension Picker - show at all levels when zoomed in */}
        {enableDimensionPicker && dropdownDimensions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              {zoomPath.length === 0
                ? "Break down by:"
                : "Break down children by:"}
            </span>
            <Select
              value={currentChildDimensionId ?? undefined}
              onValueChange={(value) => {
                // Set the child dimension for the current path
                state.setNodeChildDimension(state.path, value);
              }}
            >
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <SelectValue placeholder="Select dimension..." />
              </SelectTrigger>
              <SelectContent>
                {dropdownDimensions.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id} className="text-xs">
                    {dim.icon && <span className="mr-2">{dim.icon}</span>}
                    {dim.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </motion.div>
  );
}
