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
  CubeTimeSubrangeControl,
  CubeHierarchicalBreakdown,
} from "@/features/_common/Cube/index.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";

interface SummarySidebarProps {
  report: GeneratedReportSource;
  services?: WithFormatService;
}

export function SummarySidebar({
  report: _report,
  services,
}: SummarySidebarProps) {
  // Create default format service if not provided
  const formatService =
    services?.formatService || createFormatService(() => new Date());
  const servicesWithFormat = { formatService };
  return (
    <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
      <div className="p-4 space-y-4 flex-1">
        <CubeSummary />
        <CubeTimeSubrangeControl services={servicesWithFormat} />
        <CubeBreakdownControl />
      </div>
      <div className="p-4 pt-0">
        <CubeHierarchicalBreakdown />
      </div>
    </div>
  );
}
