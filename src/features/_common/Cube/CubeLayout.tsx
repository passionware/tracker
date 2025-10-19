/**
 * Cube Layout Component
 *
 * A generic three-column layout component that accepts React nodes for its slots.
 * Provides a standardized layout structure for Cube analysis interfaces.
 */

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CubeLayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  className?: string;
  leftSidebarWidth?: string;
  rightSidebarWidth?: string;
}

export function CubeLayout({
  children,
  leftSidebar,
  rightSidebar,
  className = "",
  leftSidebarWidth = "w-80",
  rightSidebarWidth = "w-80",
}: CubeLayoutProps) {
  return (
    <div className={cn("flex h-full min-w-0", className)}>
      {/* Left Sidebar */}
      {leftSidebar && (
        <div
          className={`${leftSidebarWidth} border-r border-slate-200 bg-white overflow-y-auto flex flex-col`}
        >
          {leftSidebar}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Right Sidebar */}
      {rightSidebar && (
        <div
          className={`${rightSidebarWidth} border-l border-slate-200 bg-white overflow-y-auto`}
        >
          {rightSidebar}
        </div>
      )}
    </div>
  );
}
