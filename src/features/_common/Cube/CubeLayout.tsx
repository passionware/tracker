/**
 * Cube Layout Component
 *
 * Provides a standardized three-column layout for Cube analysis:
 * - Left sidebar: Summary and breakdown controls
 * - Center: Main cube view
 * - Right sidebar: Dimension explorer and charts
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ReactNode } from "react";
import {
  CubeSummary,
  CubeBreakdownControl,
  CubeHierarchicalBreakdown,
} from "./index.ts";

interface CubeLayoutProps {
  report: GeneratedReportSource;
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  className?: string;
}

export function CubeLayout({
  report,
  children,
  leftSidebar,
  rightSidebar,
  className = "",
}: CubeLayoutProps) {
  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Sidebar - Summary and Controls */}
      <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
        {leftSidebar || (
          <>
            <div className="p-4 space-y-4 flex-1">
              <CubeSummary report={report} />
              <CubeBreakdownControl />
            </div>
            <div className="p-4 pt-0">
              <CubeHierarchicalBreakdown report={report} />
            </div>
          </>
        )}
      </div>

      {/* Main Content - Cube View */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Right Sidebar - Dimension Explorer */}
      <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
        {rightSidebar}
      </div>
    </div>
  );
}
