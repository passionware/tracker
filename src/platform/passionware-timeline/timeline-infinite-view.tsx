"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
import { createDefaultTimelineViewportShadows } from "./timeline-time-range-shadow-presets.ts";

const TimelineToolbar = memo(function TimelineToolbar({
  canToggleRangeShading,
  showNightRanges,
  showWeekendRanges,
  onShowNightRangesChange,
  onShowWeekendRangesChange,
}: {
  canToggleRangeShading: boolean;
  showNightRanges: boolean;
  showWeekendRanges: boolean;
  onShowNightRangesChange: (next: boolean) => void;
  onShowWeekendRangesChange: (next: boolean) => void;
}) {
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="xs" className="h-7 text-xs">
              Instructions
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 text-xs">
            <ul className="space-y-1.5 text-muted-foreground">
              <li>Drag to pan.</li>
              <li>Scroll to scroll vertically.</li>
              <li>Shift + Scroll to pan horizontally.</li>
              <li>Ctrl + Scroll to zoom.</li>
              <li>Tool controls default left-drag behavior.</li>
              <li>Ctrl + drag (or right-drag) selects range.</li>
              <li>Cmd + drag (or middle-drag) draws.</li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tool:</span>
          <Select
            value={currentTool}
            onValueChange={(value) =>
              setCurrentTool(value as "pan" | "draw" | "select")
            }
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pan">Pan</SelectItem>
              <SelectItem value="draw">Draw</SelectItem>
              <SelectItem value="select">Select</SelectItem>
            </SelectContent>
          </Select>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="h-7 text-xs"
              disabled={!canToggleRangeShading}
            >
              Ranges
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={showNightRanges}
              onCheckedChange={(checked) =>
                onShowNightRangesChange(checked === true)
              }
            >
              Night ranges
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showWeekendRanges}
              onCheckedChange={(checked) =>
                onShowWeekendRangesChange(checked === true)
              }
            >
              Weekend ranges
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  | "renderItem"
  | "onItemHover"
  | "isEventSelected"
  | "renderDrawingPreviewLabel"
  | "renderLaneLabel"
  | "hideLaneControls"
  | "timeRangeShadows"
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
  const {
    toggleLaneExpanded,
    toggleLaneMinimized,
    renderLaneLabel,
    hideLaneControls,
    itemActivateTrigger,
    renderItem,
    onItemHover,
    isEventSelected,
    renderDrawingPreviewLabel,
    timeRangeShadows,
  } = props;

  return (
    <TimelineScrollSurface>
      <TimelinePreviewRefSync
        previewItemRef={previewItemRef}
        screenXToContainerX={screenXToContainerX}
      />
      <TimelineScrollHeaders />
      <TimelineLaneSidebarBlock
        toggleLaneExpanded={toggleLaneExpanded}
        toggleLaneMinimized={toggleLaneMinimized}
        renderLaneLabel={renderLaneLabel}
        hideLaneControls={hideLaneControls}
      />
      <TimelineTracksPanel
        renderItem={renderItem}
        onItemHover={onItemHover}
        isEventSelected={isEventSelected}
        renderDrawingPreviewLabel={renderDrawingPreviewLabel}
        itemActivateTrigger={itemActivateTrigger}
        timeRangeShadows={timeRangeShadows}
      />
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
  const defaultShowRangeShading = props.defaultShowRangeShading ?? true;
  const [showNightRanges, setShowNightRanges] = useState(defaultShowRangeShading);
  const [showWeekendRanges, setShowWeekendRanges] = useState(
    defaultShowRangeShading,
  );

  useEffect(() => {
    const key = props.rangeShadingPreferenceKey;
    const fallback = defaultShowRangeShading;
    if (!key) {
      setShowNightRanges(fallback);
      setShowWeekendRanges(fallback);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        setShowNightRanges(fallback);
        setShowWeekendRanges(fallback);
        return;
      }
      if (raw === "1" || raw === "true") {
        setShowNightRanges(true);
        setShowWeekendRanges(true);
        return;
      }
      if (raw === "0" || raw === "false") {
        setShowNightRanges(false);
        setShowWeekendRanges(false);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === "object" &&
        parsed != null &&
        "night" in parsed &&
        "weekend" in parsed &&
        typeof (parsed as { night: unknown }).night === "boolean" &&
        typeof (parsed as { weekend: unknown }).weekend === "boolean"
      ) {
        setShowNightRanges((parsed as { night: boolean }).night);
        setShowWeekendRanges((parsed as { weekend: boolean }).weekend);
        return;
      }
      setShowNightRanges(fallback);
      setShowWeekendRanges(fallback);
    } catch {
      setShowNightRanges(fallback);
      setShowWeekendRanges(fallback);
    }
  }, [defaultShowRangeShading, props.rangeShadingPreferenceKey]);

  const persistRangeShading = useCallback(
    (night: boolean, weekend: boolean) => {
      const key = props.rangeShadingPreferenceKey;
      if (!key) return;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            night,
            weekend,
          }),
        );
      } catch {
        // noop: privacy mode / disabled storage
      }
    },
    [props.rangeShadingPreferenceKey],
  );
  const handleShowNightRangesChange = useCallback(
    (next: boolean) => {
      setShowNightRanges(next);
      persistRangeShading(next, showWeekendRanges);
    },
    [persistRangeShading, showWeekendRanges],
  );
  const handleShowWeekendRangesChange = useCallback(
    (next: boolean) => {
      setShowWeekendRanges(next);
      persistRangeShading(showNightRanges, next);
    },
    [persistRangeShading, showNightRanges],
  );

  const mergedTimeRangeShadows = useMemo(() => {
    const user = props.timeRangeShadows ?? [];
    if (props.appendDefaultTimeRangeShadows === false) {
      return user;
    }
    return [
      ...createDefaultTimelineViewportShadows({
        includeNightHours: showNightRanges,
        includeWeekend: showWeekendRanges,
      }),
      ...user,
    ];
  }, [
    props.appendDefaultTimeRangeShadows,
    props.timeRangeShadows,
    showNightRanges,
    showWeekendRanges,
  ]);

  const embedded = props.embedded ?? false;
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
        {embedded ? null : (
          <TimelineToolbar
            canToggleRangeShading={props.appendDefaultTimeRangeShadows !== false}
            showNightRanges={showNightRanges}
            showWeekendRanges={showWeekendRanges}
            onShowNightRangesChange={handleShowNightRangesChange}
            onShowWeekendRangesChange={handleShowWeekendRangesChange}
          />
        )}
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
              renderLaneLabel={props.renderLaneLabel}
              hideLaneControls={props.hideLaneControls}
              timeRangeShadows={mergedTimeRangeShadows}
              toggleLaneExpanded={props.state.toggleLaneExpanded}
              toggleLaneMinimized={props.state.toggleLaneMinimized}
              itemActivateTrigger={
                props.interactionOptions?.itemActivateTrigger ?? "mousedown"
              }
            />
          </div>
        </TimelineInteractionBridge>
        {embedded ? null : <TimelineStatusBar />}
      </div>
    </TimelineRefsProvider>
  );
}
