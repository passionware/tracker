/**
 * Cube Layout Component
 *
 * A generic three-column layout component that accepts React nodes for its slots.
 * Provides a standardized layout structure for Cube analysis interfaces.
 * The bottom slot consumes the central area and is collapsible and resizable.
 */

import { SplitViewLayout } from "@/features/_common/SplitViewLayout";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CubeLayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  bottomSlot?: ReactNode;
  className?: string;
  leftSidebarWidth?: string;
  rightSidebarWidth?: string;
  topPanelDefaultSize?: number;
  topPanelMinSize?: number;
  bottomPanelDefaultSize?: number;
  bottomPanelMinSize?: number;
}

export function CubeLayout({
  children,
  leftSidebar,
  rightSidebar,
  bottomSlot,
  className = "",
  leftSidebarWidth = "w-80",
  rightSidebarWidth = "w-80",
  topPanelDefaultSize = 60,
  topPanelMinSize = 20,
  bottomPanelDefaultSize = 40,
  bottomPanelMinSize = 20,
}: CubeLayoutProps) {
  return (
    <div className={cn("flex h-full min-w-0", className)}>
      {/* Left Sidebar */}
      {leftSidebar && (
        <div
          className={`${leftSidebarWidth} border-r border-border bg-card overflow-y-auto flex flex-col`}
        >
          {leftSidebar}
        </div>
      )}

      {/* Central Area - Split between main content and bottom slot */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {bottomSlot ? (
          <SplitViewLayout
            viewMode="both"
            topSlot={
              <div className="flex-1 overflow-auto min-w-0 min-h-0 h-full">
                {children}
              </div>
            }
            bottomSlot={bottomSlot}
            topPanelDefaultSize={topPanelDefaultSize}
            topPanelMinSize={topPanelMinSize}
            bottomPanelDefaultSize={bottomPanelDefaultSize}
            bottomPanelMinSize={bottomPanelMinSize}
            className="h-full"
          />
        ) : (
          <div className="flex-1 overflow-auto min-w-0 min-h-0">{children}</div>
        )}
      </div>

      {/* Right Sidebar */}
      {rightSidebar && (
        <div
          className={`${rightSidebarWidth} border-l border-border bg-card overflow-y-auto`}
        >
          {rightSidebar}
        </div>
      )}
    </div>
  );
}
