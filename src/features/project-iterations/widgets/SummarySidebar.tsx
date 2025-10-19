/**
 * Summary Sidebar Component
 *
 * Displays summary statistics and sunburst chart using shared cube context.
 * Can be used independently in dashboard layouts.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import {
  CubeSummary,
  CubeBreakdownControl,
  CubeHierarchicalBreakdown,
} from "@/features/_common/Cube/index.ts";

interface SummarySidebarProps {
  report: GeneratedReportSource;
}

export function SummarySidebar({ report: _report }: SummarySidebarProps) {
  return (
    <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
      <div className="p-4 space-y-4 flex-1">
        <CubeSummary />
        <CubeBreakdownControl />
      </div>
      <div className="p-4 pt-0">
        <CubeHierarchicalBreakdown />
      </div>
    </div>
  );
}
