/**
 * Shared layout wrapper component for Cube stories
 *
 * Provides consistent layout structure matching GroupedViewPage.tsx
 * with header, left sidebar, main content, and right sidebar
 */

import React from "react";
import {
  CubeBreakdownControl,
  CubeTimeSubrangeControl,
  CubeDimensionExplorer,
  CubeHierarchicalBreakdown,
  CubeLayout,
  CubeSummary,
} from "./index.ts";
import { CubeTimelineView } from "./CubeTimelineView.tsx";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";

interface StoryLayoutWrapperProps {
  title: string;
  description: string;
  children: React.ReactNode;
  services?: WithFormatService;
}

export function StoryLayoutWrapper({
  title,
  description,
  children,
  services,
}: StoryLayoutWrapperProps) {
  // Create default format service if not provided
  const formatService =
    services?.formatService || createFormatService(() => new Date());
  const servicesWithFormat = { formatService };
  const content = (
    <div className="h-full flex flex-col bg-white">
      {/* Header with title */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        <CubeLayout
          className="w-full"
          leftSidebar={
            <>
              <div className="p-4 space-y-4 flex-1">
                <CubeSummary />
                <CubeTimeSubrangeControl services={servicesWithFormat} />
                <CubeBreakdownControl />
              </div>
              <div className="p-4 pt-0">
                <CubeHierarchicalBreakdown />
              </div>
            </>
          }
          rightSidebar={<CubeDimensionExplorer />}
          bottomSlot={<CubeTimelineView />}
        >
          {children}
        </CubeLayout>
      </div>
    </div>
  );

  return content;
}
