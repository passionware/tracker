/**
 * Cube Layout Component
 *
 * A generic three-column layout component that accepts React nodes for its slots.
 * Provides a standardized layout structure for Cube analysis interfaces.
 * The bottom slot consumes the central area and is collapsible.
 */

import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CubeLayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  bottomSlot?: ReactNode;
  bottomSlotTitle?: ReactNode;
  className?: string;
  leftSidebarWidth?: string;
  rightSidebarWidth?: string;
  defaultBottomSlotOpen?: boolean;
}

export function CubeLayout({
  children,
  leftSidebar,
  rightSidebar,
  bottomSlot,
  bottomSlotTitle,
  className = "",
  leftSidebarWidth = "w-80",
  rightSidebarWidth = "w-80",
  defaultBottomSlotOpen = true,
}: CubeLayoutProps) {
  const [isBottomSlotOpen, setIsBottomSlotOpen] = useState(
    defaultBottomSlotOpen,
  );

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
        {/* Main Content */}
        <div className="flex-1 overflow-auto min-w-0 min-h-0">{children}</div>

        {/* Bottom Slot - Collapsible */}
        {bottomSlot && (
          <Collapsible
            open={isBottomSlotOpen}
            onOpenChange={setIsBottomSlotOpen}
            className="border-t border-border bg-card flex-shrink-0"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full h-8 px-2 justify-between rounded-none border-b border-border hover:bg-accent"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {bottomSlotTitle || "Timeline View"}
                </span>
                {isBottomSlotOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden">
                {bottomSlot}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
