"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { type SnapOption, formatTime } from "./passionware-timeline-core.ts";
import type { CalculatedDrawPreview } from "./timeline-layout-logic.ts";
import {
  useSetTimelineTool,
  useSetTimelineSnapOption,
  useSetTimelineZoom,
  useTimelineMergedItems,
  useTimelineSelectedItemId,
  useTimelineSnapOption,
  useTimelineTool,
  useTimelineVisibleLaneRows,
  useTimelineZoom,
  useTimelineItemsForTimelineCount,
} from "./use-timeline-selectors.ts";
import { TimelineRefsProvider, useTimelineRefs } from "./timeline-refs-context.tsx";
import { TimelineInteractionBridge } from "./timeline-handlers-ref-context.tsx";
import { TimelinePreviewRefSync } from "./timeline-preview-ref-sync.tsx";
import { TimelineLaneSidebarBlock } from "./timeline-lane-sidebar-block.tsx";
import { TimelineNowIndicator, TimelineScrollHeaders } from "./timeline-scroll-headers.tsx";
import { TimelineScrollSurface } from "./timeline-scroll-surface.tsx";
import { TimelineTracksPanel } from "./timeline-tracks-panel.tsx";
import type { InfiniteTimelineProps } from "./timeline-infinite-types.ts";

const TimelineToolbar = memo(function TimelineToolbar() {
  const snapOption = useTimelineSnapOption();
  const setSnapOption = useSetTimelineSnapOption();
  const currentTool = useTimelineTool();
  const setCurrentTool = useSetTimelineTool();
  const zoom = useTimelineZoom();
  const setZoom = useSetTimelineZoom();
  return (
    <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-foreground">Timeline Editor</h2>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <span>Drag to pan</span>
          <span className="text-border">|</span>
          <span>Scroll to scroll vertically</span>
          <span className="text-border">|</span>
          <span>Shift+Scroll to pan horizontally</span>
          <span className="text-border">|</span>
          <span>Ctrl+Scroll to zoom</span>
          <span className="text-border">|</span>
          <span>Tool sets default left-drag behavior</span>
          <span className="text-border">|</span>
          <span>Ctrl+drag/right-drag selects</span>
          <span className="text-border">|</span>
          <span>Cmd+drag or middle-drag draws</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tool:</span>
          <ToggleGroup
            type="single"
            value={currentTool}
            onValueChange={(value) => {
              if (value === "") return;
              setCurrentTool(value as "pan" | "draw" | "select");
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="pan" className="h-7 px-2 text-xs">
              Pan
            </ToggleGroupItem>
            <ToggleGroupItem value="draw" className="h-7 px-2 text-xs">
              Draw
            </ToggleGroupItem>
            <ToggleGroupItem value="select" className="h-7 px-2 text-xs">
              Select
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Snap:</span>
          <Select
            value={snapOption}
            onValueChange={(value) => setSnapOption(value as SnapOption)}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="5min">5 min</SelectItem>
              <SelectItem value="15min">15 min</SelectItem>
              <SelectItem value="30min">30 min</SelectItem>
              <SelectItem value="1hour">1 hour</SelectItem>
              <SelectItem value="1day">1 day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Zoom:{" "}
            {(() => {
              const p = zoom * 100;
              if (p < 0.01) return `${p.toFixed(3)}%`;
              if (p < 1) return `${p.toFixed(2)}%`;
              return `${Math.round(p)}%`;
            })()}
          </span>
          <Button
            onClick={() => setZoom(1)}
            variant="outline"
            className="h-7"
            size="xs"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
});

const TimelineStatusBar = memo(function TimelineStatusBar() {
  const itemsForTimelineCount = useTimelineItemsForTimelineCount();
  const visibleLaneRows = useTimelineVisibleLaneRows();
  const selectedItemId = useTimelineSelectedItemId();
  const mergedItems = useTimelineMergedItems();
  return (
    <div className="flex items-center justify-between px-4 h-8 border-t border-border bg-card text-xs text-muted-foreground">
      <span>
        {itemsForTimelineCount} events across {visibleLaneRows.length} tracks
      </span>
      <div className="flex items-center gap-4">
        {selectedItemId &&
          (() => {
            const item = mergedItems.find((i) => i.id === selectedItemId);
            if (!item) return null;
            return (
              <span>
                {item.label}: {formatTime(item.start)} - {formatTime(item.end)}
              </span>
            );
          })()}
        <span className="text-muted-foreground/60">
          Press Delete to remove selected
        </span>
      </div>
    </div>
  );
});

type ScrollableMainProps<
  Data = unknown,
  TLaneMeta = unknown,
> = Pick<
  InfiniteTimelineProps<Data, TLaneMeta>,
  "renderItem" | "onItemHover" | "isEventSelected" | "renderDrawingPreviewLabel"
> & {
  toggleLaneExpanded: (laneId: string) => void;
  toggleLaneMinimized: (laneId: string) => void;
  itemActivateTrigger: "mousedown" | "click";
};

function TimelineScrollableMainInner<
  Data = unknown,
  TLaneMeta = unknown,
>(props: ScrollableMainProps<Data, TLaneMeta>) {
  const { previewItemRef, screenXToContainerX } = useTimelineRefs();

  return (
    <TimelineScrollSurface>
      <TimelinePreviewRefSync
        previewItemRef={previewItemRef}
        screenXToContainerX={screenXToContainerX}
      />
      <TimelineScrollHeaders />
      <TimelineLaneSidebarBlock
        toggleLaneExpanded={props.toggleLaneExpanded}
        toggleLaneMinimized={props.toggleLaneMinimized}
      />
      <TimelineTracksPanel {...props} />
      <TimelineNowIndicator />
    </TimelineScrollSurface>
  );
}

const TimelineScrollableMain = memo(
  TimelineScrollableMainInner,
) as typeof TimelineScrollableMainInner;

export function TimelineInfiniteRoot<Data = unknown, TLaneMeta = unknown>(
  props: InfiniteTimelineProps<Data, TLaneMeta>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewItemRef = useRef<CalculatedDrawPreview | null>(null);
  const screenXToContainerX = useCallback((screenX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return screenX;
    return screenX - rect.left;
  }, []);

  const refsValue = useMemo(
    () => ({ containerRef, previewItemRef, screenXToContainerX }),
    [screenXToContainerX],
  );

  return (
    <TimelineRefsProvider value={refsValue}>
      <div className="flex flex-col h-full bg-background overflow-hidden select-none rounded-md">
        <TimelineToolbar />
        <TimelineInteractionBridge
          state={props.state}
          interactionOptions={{
            ...(props.interactionOptions ?? {}),
            isEventSelected: props.isEventSelected,
          }}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TimelineScrollableMain
              renderItem={props.renderItem}
              onItemHover={props.onItemHover}
              isEventSelected={props.isEventSelected}
              renderDrawingPreviewLabel={props.renderDrawingPreviewLabel}
              toggleLaneExpanded={props.state.toggleLaneExpanded}
              toggleLaneMinimized={props.state.toggleLaneMinimized}
              itemActivateTrigger={
                props.interactionOptions?.itemActivateTrigger ?? "mousedown"
              }
            />
          </div>
        </TimelineInteractionBridge>
        <TimelineStatusBar />
      </div>
    </TimelineRefsProvider>
  );
}
