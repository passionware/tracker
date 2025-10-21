/**
 * Cube Navigation Component
 *
 * Breadcrumbs and dimension picker for navigating the cube hierarchy
 */

import { Button } from "@/components/ui/button.tsx";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import type { DimensionDescriptor } from "./CubeService.types.ts";
import type { CubeState } from "./useCubeState.ts";
import { cn } from "@/lib/utils.ts";

export interface BreadcrumbItem {
  dimensionId: string;
  dimensionKey: string;
}

interface CubeNavigationProps {
  state: CubeState;
  zoomPath: BreadcrumbItem[];
  dimensions: DimensionDescriptor<any>[];
  className?: string;
}

export function CubeNavigation({
  state,
  zoomPath,
  dimensions,
  className,
}: CubeNavigationProps) {
  const handleBreadcrumbClick = (index: number) => {
    state.navigateToLevel(index);
  };

  return (
    <motion.div
      className={cn("mb-4 p-3 bg-slate-50 rounded-lg border", className)}
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
            // Use the dimension's formatValue directly on the dimensionValue from the zoom path
            // This works the same way as the sidebar charts and doesn't depend on finding groups
            const pathItem = state.path[index];
            const label =
              dimension?.formatValue && pathItem?.dimensionValue
                ? dimension.formatValue(pathItem.dimensionValue)
                : breadcrumb.dimensionKey;

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
      </div>
    </motion.div>
  );
}
