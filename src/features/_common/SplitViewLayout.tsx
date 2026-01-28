import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable.tsx";

export type ViewMode = "timeline" | "table" | "both";

interface SplitViewLayoutProps {
  topSlot: ReactNode;
  bottomSlot: ReactNode;
  viewMode: ViewMode;
  topPanelDefaultSize?: number;
  topPanelMinSize?: number;
  bottomPanelDefaultSize?: number;
  bottomPanelMinSize?: number;
  className?: string;
}

export function SplitViewLayout({
  topSlot,
  bottomSlot,
  viewMode,
  topPanelDefaultSize = 40,
  topPanelMinSize = 20,
  bottomPanelDefaultSize = 60,
  bottomPanelMinSize = 30,
  className,
}: SplitViewLayoutProps) {
  return (
    <div className={cn(viewMode === "both" ? "flex-1 min-h-0" : "contents", className)}>
      {viewMode === "both" ? (
        <ResizablePanelGroup direction="vertical" className="h-full">
          <ResizablePanel
            defaultSize={topPanelDefaultSize}
            minSize={topPanelMinSize}
            className="flex flex-col min-h-0"
          >
            {topSlot}
          </ResizablePanel>
          <ResizableHandle withHandle className="my-2" />
          <ResizablePanel
            defaultSize={bottomPanelDefaultSize}
            minSize={bottomPanelMinSize}
            className="flex flex-col min-h-0"
          >
            {bottomSlot}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === "timeline" ? (
        topSlot
      ) : (
        bottomSlot
      )}
    </div>
  );
}
