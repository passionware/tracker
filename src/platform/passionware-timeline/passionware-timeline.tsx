"use client";

import React from "react";
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";

// Types
export interface TimelineItem {
  id: string;
  laneId: string;
  start: number; // Time in minutes from epoch
  end: number;
  label: string;
  color?: string;
  row?: number; // Sub-row for parallel items
}

export interface Lane {
  id: string;
  name: string;
  color: string;
}

interface DragState {
  type: "move" | "resize-start" | "resize-end" | "draw";
  itemId?: string;
  laneId?: string;
  startX: number;
  startTime: number;
  originalItem?: TimelineItem;
  drawStart?: number;
}

type SnapOption = "none" | "5min" | "15min" | "30min" | "1hour" | "1day";

// Constants
const PIXELS_PER_MINUTE = 2; // Base pixels per minute
const MIN_ITEM_DURATION = 5; // Minimum 5 minutes
const LANE_HEIGHT = 80;
const SUB_ROW_HEIGHT = 28;
const HEADER_HEIGHT = 48;
const SIDEBAR_WIDTH = 180;

// Snap values in minutes
const SNAP_VALUES: Record<SnapOption, number> = {
  none: 0,
  "5min": 5,
  "15min": 15,
  "30min": 30,
  "1hour": 60,
  "1day": 1440,
};

// Color palette for items
const ITEM_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

// Initial data - using a base date
const BASE_DATE = new Date(2025, 0, 27, 8, 0); // Jan 27, 2025 8:00 AM
const toMinutes = (hours: number, mins = 0) => hours * 60 + mins;

const initialLanes: Lane[] = [
  { id: "lane-1", name: "Meeting Room A", color: "bg-chart-1" },
  { id: "lane-2", name: "Meeting Room B", color: "bg-chart-2" },
  { id: "lane-3", name: "Conference Hall", color: "bg-chart-3" },
  { id: "lane-4", name: "Virtual", color: "bg-chart-4" },
  { id: "lane-5", name: "External", color: "bg-chart-5" },
];

const initialItems: TimelineItem[] = [
  {
    id: "item-1",
    laneId: "lane-1",
    start: toMinutes(8),
    end: toMinutes(9, 30),
    label: "Team Standup",
    color: "bg-chart-1",
  },
  {
    id: "item-2",
    laneId: "lane-1",
    start: toMinutes(10),
    end: toMinutes(11, 30),
    label: "Product Review",
    color: "bg-chart-1",
  },
  {
    id: "item-3",
    laneId: "lane-1",
    start: toMinutes(8, 30),
    end: toMinutes(10),
    label: "Sprint Planning",
    color: "bg-chart-1",
  }, // Overlapping
  {
    id: "item-4",
    laneId: "lane-2",
    start: toMinutes(9),
    end: toMinutes(12),
    label: "Workshop",
    color: "bg-chart-2",
  },
  {
    id: "item-5",
    laneId: "lane-2",
    start: toMinutes(11),
    end: toMinutes(13),
    label: "Training Session",
    color: "bg-chart-2",
  }, // Overlapping
  {
    id: "item-6",
    laneId: "lane-3",
    start: toMinutes(8),
    end: toMinutes(10),
    label: "All Hands",
    color: "bg-chart-3",
  },
  {
    id: "item-7",
    laneId: "lane-4",
    start: toMinutes(13),
    end: toMinutes(14),
    label: "Zoom Call",
    color: "bg-chart-4",
  },
  {
    id: "item-8",
    laneId: "lane-5",
    start: toMinutes(15),
    end: toMinutes(17),
    label: "Client Meeting",
    color: "bg-chart-5",
  },
];

// Format time from minutes to display string
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
}

// Format date from minutes offset
function formatDate(minutes: number): string {
  const date = new Date(BASE_DATE.getTime() + minutes * 60 * 1000);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Get day offset in minutes
function getDayStart(minutes: number): number {
  return Math.floor(minutes / 1440) * 1440;
}

export function InfiniteTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewItemRef = useRef<{
    laneId: string;
    start: number;
    end: number;
    row: number;
  } | null>(null);
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [lanes] = useState<Lane[]>(initialLanes);
  const [scrollOffset, setScrollOffset] = useState(
    -toMinutes(7) * PIXELS_PER_MINUTE,
  ); // Start scrolled to show 8AM
  const [verticalScrollOffset, setVerticalScrollOffset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    startScrollOffset: number;
    startVerticalScrollOffset: number;
  } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [snapOption, setSnapOption] = useState<SnapOption>("15min");
  const [previewRow, setPreviewRow] = useState<{
    laneId: string;
    row: number;
  } | null>(null);
  const [currentMouseX, setCurrentMouseX] = useState<number | null>(null);

  const pixelsPerMinute = PIXELS_PER_MINUTE * zoom;

  // Snap time to grid
  const snapTime = useCallback(
    (time: number): number => {
      const snapValue = SNAP_VALUES[snapOption];
      if (snapValue === 0) return time;
      return Math.round(time / snapValue) * snapValue;
    },
    [snapOption],
  );

  // Calculate sub-rows for overlapping items in a lane
  const getItemsWithRows = useCallback(
    (
      laneId: string,
      previewItem?: { start: number; end: number; row: number },
    ) => {
      const laneItems = items.filter((item) => item.laneId === laneId);
      const sortedItems = [...laneItems].sort((a, b) => a.start - b.start);
      const itemsWithRows: (TimelineItem & { row: number })[] = [];

      for (const item of sortedItems) {
        // Find the first available row
        let row = 0;
        let foundRow = false;

        while (!foundRow) {
          // Check collision with already placed items
          const hasOverlapWithItems = itemsWithRows.some(
            (placed) =>
              placed.row === row &&
              !(item.end <= placed.start || item.start >= placed.end),
          );

          // Check collision with preview item if it's in this lane and on this row
          const hasOverlapWithPreview =
            previewItem &&
            previewItem.row === row &&
            !(item.end <= previewItem.start || item.start >= previewItem.end);

          if (!hasOverlapWithItems && !hasOverlapWithPreview) {
            foundRow = true;
          } else {
            row++;
          }
        }

        itemsWithRows.push({ ...item, row });
      }

      return itemsWithRows;
    },
    [items],
  );

  // Get max rows for a lane
  const getMaxRows = useCallback(
    (
      laneId: string,
      previewItem?: { start: number; end: number; row: number },
    ) => {
      const itemsWithRows = getItemsWithRows(laneId, previewItem);
      if (itemsWithRows.length === 0 && !previewItem) return 1;
      const maxItemRow =
        itemsWithRows.length > 0
          ? Math.max(...itemsWithRows.map((i) => i.row))
          : -1;
      const previewRow = previewItem ? previewItem.row : -1;
      return Math.max(maxItemRow, previewRow) + 1;
    },
    [getItemsWithRows],
  );

  // Get lane height (including preview row if drawing)
  const getLaneHeight = useCallback(
    (
      laneId: string,
      previewItem?: { start: number; end: number; row: number },
    ) => {
      const maxRows = Math.max(getMaxRows(laneId, previewItem), 2);
      return Math.max(LANE_HEIGHT, maxRows * SUB_ROW_HEIGHT + 16);
    },
    [getMaxRows],
  );

  // Calculate lane Y offset
  const getLaneYOffset = useCallback(
    (laneIndex: number) => {
      let offset = 0;
      const preview = previewItemRef.current;
      for (let i = 0; i < laneIndex; i++) {
        const lanePreview =
          preview && preview.laneId === lanes[i].id ? preview : undefined;
        offset += getLaneHeight(lanes[i].id, lanePreview);
      }
      return offset;
    },
    [lanes, getLaneHeight],
  );

  // Calculate visible range for markers
  const getVisibleRange = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || 1200;
    const startTime = Math.floor(-scrollOffset / pixelsPerMinute) - 60;
    const endTime =
      Math.ceil((containerWidth - scrollOffset) / pixelsPerMinute) + 60;
    return { startTime, endTime };
  }, [scrollOffset, pixelsPerMinute]);

  // Convert pixel position to time
  // pixel should be relative to the container (not screen coordinates)
  const pixelToTime = useCallback(
    (pixel: number) => {
      return (pixel - SIDEBAR_WIDTH - scrollOffset) / pixelsPerMinute;
    },
    [scrollOffset, pixelsPerMinute],
  );

  // Convert screen X coordinate to container-relative X coordinate
  const screenXToContainerX = useCallback((screenX: number): number => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return screenX;
    return screenX - rect.left;
  }, []);

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number) => {
      return time * pixelsPerMinute + scrollOffset + SIDEBAR_WIDTH;
    },
    [scrollOffset, pixelsPerMinute],
  );

  // Handle wheel scroll (horizontal pan, vertical scroll, and zoom)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom centered on mouse position
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Get mouse position relative to timeline content area
        const mouseX = e.clientX - rect.left - SIDEBAR_WIDTH;

        // Calculate time at mouse position before zoom
        const timeAtMouse =
          (mouseX - scrollOffset) / (PIXELS_PER_MINUTE * zoom);

        // Calculate new zoom level
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.25, Math.min(4, zoom * zoomFactor));

        // Calculate new scroll offset to keep the same time under the mouse
        const newScrollOffset =
          mouseX - timeAtMouse * PIXELS_PER_MINUTE * newZoom;

        setZoom(newZoom);
        setScrollOffset(newScrollOffset);
      } else if (e.shiftKey) {
        // Shift+scroll: vertical scrolling (when shift is pressed, deltaX contains the vertical scroll)
        setVerticalScrollOffset((prev) => {
          const containerHeight = containerRef.current?.clientHeight || 0;
          const preview = previewItemRef.current;
          const totalHeight = lanes.reduce((sum, lane) => {
            const lanePreview =
              preview && preview.laneId === lane.id ? preview : undefined;
            return sum + getLaneHeight(lane.id, lanePreview);
          }, 0);
          const maxOffset = Math.max(
            0,
            totalHeight - containerHeight + HEADER_HEIGHT,
          );
          // When shift is pressed, horizontal scroll becomes vertical, so use deltaX
          const scrollDelta =
            Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          return Math.max(0, Math.min(maxOffset, prev + scrollDelta));
        });
      } else {
        // Regular scroll: horizontal pan
        setScrollOffset((prev) => prev - e.deltaX - e.deltaY);
      }
    },
    [zoom, scrollOffset, lanes, getLaneHeight],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Handle middle mouse button panning
  const handleMouseDown = useCallback(
    (e: globalThis.MouseEvent) => {
      // Middle mouse button (button 1) or wheel button
      if (e.button === 1 && !dragState) {
        e.preventDefault();
        setPanState({
          startX: e.clientX,
          startY: e.clientY,
          startScrollOffset: scrollOffset,
          startVerticalScrollOffset: verticalScrollOffset,
        });
      }
    },
    [dragState, scrollOffset, verticalScrollOffset],
  );

  // Handle panning with middle mouse button
  const handlePanMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!panState) return;

      const deltaX = e.clientX - panState.startX;
      const deltaY = e.clientY - panState.startY;

      setScrollOffset(panState.startScrollOffset + deltaX);
      const containerHeight = containerRef.current?.clientHeight || 0;
      const preview = previewItemRef.current;
      const totalHeight = lanes.reduce((sum, lane) => {
        const lanePreview =
          preview && preview.laneId === lane.id ? preview : undefined;
        return sum + getLaneHeight(lane.id, lanePreview);
      }, 0);
      const maxOffset = Math.max(
        0,
        totalHeight - containerHeight + HEADER_HEIGHT,
      );
      const newOffset = panState.startVerticalScrollOffset - deltaY;
      setVerticalScrollOffset(Math.max(0, Math.min(maxOffset, newOffset)));
    },
    [panState, lanes, getLaneHeight],
  );

  const handlePanUp = useCallback(() => {
    setPanState(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    if (panState) {
      window.addEventListener("mousemove", handlePanMove);
      window.addEventListener("mouseup", handlePanUp);
      // Prevent context menu on middle mouse
      window.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handlePanMove);
      window.removeEventListener("mouseup", handlePanUp);
    };
  }, [handleMouseDown, handlePanMove, handlePanUp, panState]);

  // Generate a unique ID
  const generateId = () =>
    `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle mouse down on item (start drag)
  const handleItemMouseDown = (
    e: ReactMouseEvent,
    item: TimelineItem,
    type: "move" | "resize-start" | "resize-end",
  ) => {
    // Ignore middle mouse button
    if (e.button === 1) return;
    e.stopPropagation();
    const containerX = screenXToContainerX(e.clientX);
    setSelectedItemId(item.id);
    setDragState({
      type,
      itemId: item.id,
      startX: e.clientX,
      startTime: pixelToTime(containerX),
      originalItem: { ...item },
    });
  };

  // Handle mouse down on lane (start drawing)
  const handleLaneMouseDown = (e: ReactMouseEvent, laneId: string) => {
    // Ignore middle mouse button
    if (e.button === 1) return;
    if (dragState) return;

    const containerX = screenXToContainerX(e.clientX);
    const time = snapTime(pixelToTime(containerX));
    const laneIndex = lanes.findIndex((l) => l.id === laneId);

    setDragState({
      type: "draw",
      laneId,
      startX: e.clientX,
      startTime: time,
      drawStart: time,
    });
    setCurrentMouseX(e.clientX);

    setSelectedItemId(null);
  };

  // Handle global mouse move
  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!dragState) return;

      const containerX = screenXToContainerX(e.clientX);
      const currentTime = pixelToTime(containerX);

      if (dragState.type === "draw" && dragState.drawStart !== undefined) {
        // Track mouse position for preview item calculation
        setCurrentMouseX(e.clientX);
        return;
      }

      if (dragState.originalItem && dragState.itemId) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== dragState.itemId) return item;

            const original = dragState.originalItem!;
            const deltaTime = currentTime - dragState.startTime;
            let newStart = original.start;
            let newEnd = original.end;

            switch (dragState.type) {
              case "move":
                newStart = snapTime(original.start + deltaTime);
                newEnd = newStart + (original.end - original.start);
                break;
              case "resize-start":
                newStart = snapTime(
                  Math.min(
                    original.start + deltaTime,
                    original.end - MIN_ITEM_DURATION,
                  ),
                );
                break;
              case "resize-end":
                newEnd = snapTime(
                  Math.max(
                    original.end + deltaTime,
                    original.start + MIN_ITEM_DURATION,
                  ),
                );
                break;
            }

            return { ...item, start: newStart, end: newEnd };
          }),
        );
      }
    },
    [dragState, pixelToTime, snapTime, screenXToContainerX],
  );

  // Handle global mouse up
  const handleMouseUp = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!dragState) return;

      if (
        dragState.type === "draw" &&
        dragState.laneId &&
        dragState.drawStart !== undefined
      ) {
        const containerX = screenXToContainerX(e.clientX);
        const endTime = snapTime(pixelToTime(containerX));
        const start = Math.min(dragState.drawStart, endTime);
        const end = Math.max(dragState.drawStart, endTime);

        if (end - start >= MIN_ITEM_DURATION) {
          const laneIndex = lanes.findIndex((l) => l.id === dragState.laneId);
          const newItem: TimelineItem = {
            id: generateId(),
            laneId: dragState.laneId,
            start,
            end,
            label: "New Event",
            color: ITEM_COLORS[laneIndex % ITEM_COLORS.length],
          };
          setItems((prev) => [...prev, newItem]);
          setSelectedItemId(newItem.id);
        }
      }

      setDragState(null);
      setPreviewRow(null);
      setCurrentMouseX(null);
    },
    [dragState, pixelToTime, lanes, snapTime, screenXToContainerX],
  );

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Delete selected item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        setItems((prev) => prev.filter((item) => item.id !== selectedItemId));
        setSelectedItemId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId]);

  const { startTime, endTime } = getVisibleRange();

  // Calculate spacing in pixels to determine label density
  const hourSpacingPx = 60 * pixelsPerMinute; // 60 minutes per hour
  const quarterSpacingPx = 15 * pixelsPerMinute; // 15 minutes

  // Determine label interval based on spacing
  // If spacing < 30px: show labels every 12 hours (12, 0)
  // If spacing < 50px: show labels every 6 hours (0, 6, 12, 18)
  // If spacing < 80px: show labels every 3 hours (0, 3, 6, 9, 12, 15, 18, 21)
  // Otherwise: show all hour labels
  // If 15-min spacing >= 40px: also show 15-minute labels
  const getLabelInterval = (): number => {
    if (hourSpacingPx < 20) return 12 * 60; // 12 hours
    if (hourSpacingPx < 30) return 6 * 60; // 6 hours
    if (hourSpacingPx < 80) return 3 * 60; // 3 hours
    return 60; // 1 hour (all hours)
  };

  const labelInterval = getLabelInterval();
  const showQuarterLabels = quarterSpacingPx >= 55; // Show 15-min labels when spacing is good

  // Generate time markers (hourly with 15-min subdivisions)
  const hourMarkers: number[] = [];
  const quarterMarkers: number[] = [];
  const startHour = Math.floor(startTime / 60) * 60;
  const endHour = Math.ceil(endTime / 60) * 60;

  for (let t = startHour; t <= endHour; t += 60) {
    hourMarkers.push(t);
  }

  // Only show quarter markers if hour spacing is reasonable
  if (hourSpacingPx >= 30) {
    for (let t = startHour; t <= endHour; t += 15) {
      if (t % 60 !== 0) {
        quarterMarkers.push(t);
      }
    }
  }

  // Generate day markers
  const dayMarkers: number[] = [];
  const startDay = getDayStart(startTime);
  const endDay = getDayStart(endTime) + 1440;
  for (let d = startDay; d <= endDay; d += 1440) {
    dayMarkers.push(d);
  }

  // Drawing preview dimensions
  const getDrawingPreview = () => {
    if (
      !dragState ||
      dragState.type !== "draw" ||
      dragState.drawStart === undefined
    ) {
      return null;
    }
    return {
      laneId: dragState.laneId,
      startTime: dragState.drawStart,
    };
  };

  const drawingPreview = getDrawingPreview();

  // Calculate preview item's full information for collision detection
  const calculatedPreviewItem = React.useMemo(() => {
    if (
      !dragState ||
      dragState.type !== "draw" ||
      dragState.drawStart === undefined ||
      !dragState.laneId ||
      currentMouseX === null
    ) {
      return null;
    }

    const containerX = screenXToContainerX(currentMouseX);
    const currentTime = snapTime(pixelToTime(containerX));
    const previewStart = Math.min(dragState.drawStart, currentTime);
    const previewEnd = Math.max(dragState.drawStart, currentTime);

    // Calculate row for preview item (without considering it in existing items yet)
    const laneItems = items.filter((item) => item.laneId === dragState.laneId);
    const sortedItems = [...laneItems].sort((a, b) => a.start - b.start);
    const itemsWithRows: (TimelineItem & { row: number })[] = [];

    for (const item of sortedItems) {
      let row = 0;
      let foundRow = false;

      while (!foundRow) {
        const hasOverlap = itemsWithRows.some(
          (placed) =>
            placed.row === row &&
            !(item.end <= placed.start || item.start >= placed.end),
        );
        if (!hasOverlap) {
          foundRow = true;
        } else {
          row++;
        }
      }

      itemsWithRows.push({ ...item, row });
    }

    // Calculate preview item's row
    let previewRow = 0;
    let foundPreviewRow = false;
    while (!foundPreviewRow) {
      const hasOverlap = itemsWithRows.some(
        (placed) =>
          placed.row === previewRow &&
          !(previewEnd <= placed.start || previewStart >= placed.end),
      );
      if (!hasOverlap) {
        foundPreviewRow = true;
      } else {
        previewRow++;
      }
    }

    return {
      laneId: dragState.laneId,
      start: previewStart,
      end: previewEnd,
      row: previewRow,
    };
  }, [
    dragState,
    currentMouseX,
    items,
    snapTime,
    pixelToTime,
    screenXToContainerX,
  ]);

  // Update ref when preview item changes
  useEffect(() => {
    previewItemRef.current = calculatedPreviewItem;
  }, [calculatedPreviewItem]);

  // Total timeline height
  const totalHeight = lanes.reduce((sum, lane) => {
    const lanePreview =
      calculatedPreviewItem && calculatedPreviewItem.laneId === lane.id
        ? calculatedPreviewItem
        : undefined;
    return sum + getLaneHeight(lane.id, lanePreview);
  }, 0);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden select-none dark rounded-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-foreground">
            Timeline Editor
          </h2>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Scroll to pan</span>
            <span className="text-border">|</span>
            <span>Shift+Scroll to scroll vertically</span>
            <span className="text-border">|</span>
            <span>Middle mouse to pan</span>
            <span className="text-border">|</span>
            <span>Ctrl+Scroll to zoom</span>
            <span className="text-border">|</span>
            <span>Click+Drag to draw</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Snap Options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Snap:</span>
            <select
              value={snapOption}
              onChange={(e) => setSnapOption(e.target.value as SnapOption)}
              className="h-7 px-2 text-xs bg-secondary text-secondary-foreground rounded border-none focus:ring-1 focus:ring-ring outline-none"
            >
              <option value="none">None</option>
              <option value="5min">5 min</option>
              <option value="15min">15 min</option>
              <option value="30min">30 min</option>
              <option value="1hour">1 hour</option>
              <option value="1day">1 day</option>
            </select>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: panState ? "grabbing" : dragState ? "grabbing" : "crosshair",
        }}
      >
        {/* Date Header */}
        <div
          className="absolute top-0 left-0 right-0 h-6 bg-secondary/50 border-b border-border z-20"
          style={{ paddingLeft: SIDEBAR_WIDTH }}
        >
          <div className="relative h-full overflow-hidden">
            {dayMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
              const containerWidth = containerRef.current?.clientWidth || 2000;
              if (x < -200 || x > containerWidth + 200) return null;

              return (
                <div
                  key={`day-${minutes}`}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: x }}
                >
                  <span className="text-xs font-medium text-foreground pl-2">
                    {formatDate(minutes)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Header */}
        <div
          className="absolute top-6 left-0 right-0 h-8 bg-card border-b border-border z-20"
          style={{ paddingLeft: SIDEBAR_WIDTH }}
        >
          <div className="relative h-full overflow-hidden">
            {/* Quarter hour ticks */}
            {quarterMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
              const containerWidth = containerRef.current?.clientWidth || 2000;
              if (x < -50 || x > containerWidth) return null;

              // Show label if 15-minute labels are enabled
              const shouldShowLabel = showQuarterLabels;

              return (
                <div
                  key={`q-${minutes}`}
                  className="absolute top-0 h-full flex flex-col justify-end pb-1"
                  style={{ left: x }}
                >
                  {shouldShowLabel && (
                    <span className="text-xs tabular-nums -translate-x-1/2 text-muted-foreground">
                      {formatTime(minutes)}
                    </span>
                  )}
                  <div
                    className={cn(
                      "w-px mt-0.5 ml-0",
                      shouldShowLabel ? "h-1 bg-border/60" : "h-2 bg-border",
                    )}
                  />
                </div>
              );
            })}

            {/* Hour markers */}
            {hourMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
              const containerWidth = containerRef.current?.clientWidth || 2000;
              if (x < -50 || x > containerWidth) return null;

              // Get hour of day (0-23) for this marker
              const hourOfDay = Math.floor((minutes % 1440) / 60);

              // Determine if this hour should show a label based on interval
              let shouldShowLabel = false;
              if (labelInterval === 60) {
                // Show all hours
                shouldShowLabel = true;
              } else if (labelInterval === 3 * 60) {
                // Show every 3 hours: 0, 3, 6, 9, 12, 15, 18, 21
                shouldShowLabel = hourOfDay % 3 === 0;
              } else if (labelInterval === 6 * 60) {
                // Show every 6 hours: 0, 6, 12, 18
                shouldShowLabel = hourOfDay % 6 === 0;
              } else if (labelInterval === 12 * 60) {
                // Show every 12 hours: 0, 12
                shouldShowLabel = hourOfDay % 12 === 0;
              }

              const isMainHour = minutes % 60 === 0;
              const isMajorMarker = minutes % 360 === 0; // Every 6 hours

              return (
                <div
                  key={`h-${minutes}`}
                  className="absolute top-0 h-full flex flex-col justify-end pb-1"
                  style={{ left: x }}
                >
                  {shouldShowLabel && (
                    <span
                      className={cn(
                        "text-xs tabular-nums -translate-x-1/2",
                        isMainHour
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatTime(minutes)}
                    </span>
                  )}
                  <div
                    className={cn(
                      "w-px mt-0.5 ml-0",
                      isMajorMarker
                        ? "h-2 bg-foreground/50"
                        : shouldShowLabel
                          ? "h-1.5 bg-muted-foreground"
                          : "h-1 bg-border/60",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Lane Labels (Sidebar) */}
        <div
          className="absolute top-14 left-0 bottom-0 bg-card border-r border-border z-10 overflow-hidden"
          style={{
            width: SIDEBAR_WIDTH,
          }}
        >
          <div
            style={{
              transform: `translateY(-${verticalScrollOffset}px)`,
              position: "relative",
            }}
          >
            {lanes.map((lane, index) => {
              const lanePreview =
                calculatedPreviewItem &&
                calculatedPreviewItem.laneId === lane.id
                  ? calculatedPreviewItem
                  : undefined;
              return (
                <div
                  key={lane.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-border",
                    index % 2 === 0
                      ? "bg-timeline-lane"
                      : "bg-timeline-lane-alt",
                  )}
                  style={{ height: getLaneHeight(lane.id, lanePreview) }}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-0.5 shrink-0",
                      lane.color,
                    )}
                  />
                  <span className="text-sm text-foreground truncate">
                    {lane.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Grid and Items */}
        <div
          className="absolute top-14 bottom-0 overflow-hidden"
          style={{
            left: SIDEBAR_WIDTH,
            right: 0,
          }}
        >
          <div
            style={{
              transform: `translateY(-${verticalScrollOffset}px)`,
              position: "relative",
            }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Quarter hour lines (subtle) */}
              {quarterMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < 0 || x > containerWidth) return null;

                return (
                  <div
                    key={`qgrid-${minutes}`}
                    className="absolute top-0 w-px bg-border/20"
                    style={{ left: x, height: totalHeight }}
                  />
                );
              })}

              {/* Hour lines */}
              {hourMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < 0 || x > containerWidth) return null;

                return (
                  <div
                    key={`hgrid-${minutes}`}
                    className={cn(
                      "absolute top-0 w-px",
                      minutes % 360 === 0 ? "bg-timeline-grid" : "bg-border/40",
                    )}
                    style={{ left: x, height: totalHeight }}
                  />
                );
              })}

              {/* Day lines */}
              {dayMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < 0 || x > containerWidth) return null;

                return (
                  <div
                    key={`dgrid-${minutes}`}
                    className="absolute top-0 w-0.5 bg-primary/30"
                    style={{ left: x, height: totalHeight }}
                  />
                );
              })}
            </div>

            {/* Lanes */}
            {lanes.map((lane, laneIndex) => {
              const previewForLane =
                calculatedPreviewItem &&
                calculatedPreviewItem.laneId === lane.id
                  ? calculatedPreviewItem
                  : undefined;
              const itemsWithRows = getItemsWithRows(lane.id, previewForLane);
              const laneHeight = getLaneHeight(lane.id, previewForLane);
              const yOffset = getLaneYOffset(laneIndex);

              return (
                <div
                  key={lane.id}
                  className={cn(
                    "absolute left-0 right-0 border-b border-border",
                    laneIndex % 2 === 0
                      ? "bg-timeline-lane"
                      : "bg-timeline-lane-alt",
                  )}
                  style={{
                    top: yOffset,
                    height: laneHeight,
                  }}
                  onMouseDown={(e) => handleLaneMouseDown(e, lane.id)}
                >
                  {/* Items in this lane */}
                  {itemsWithRows.map((item) => {
                    const left = timeToPixel(item.start) - SIDEBAR_WIDTH;
                    const naturalWidth =
                      (item.end - item.start) * pixelsPerMinute;
                    const MIN_VISIBLE_WIDTH = 3;
                    const isMinWidth = naturalWidth < MIN_VISIBLE_WIDTH;
                    const width = Math.max(naturalWidth, MIN_VISIBLE_WIDTH);
                    const isSelected = selectedItemId === item.id;
                    const isHovered = hoveredItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "absolute rounded transition-shadow cursor-grab group",
                          item.color || "bg-primary",
                          isSelected &&
                            "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                          isHovered &&
                            !isSelected &&
                            "ring-1 ring-foreground/50",
                          isMinWidth && "ring-1 ring-foreground/80",
                        )}
                        style={{
                          left,
                          width,
                          top: 8 + item.row * SUB_ROW_HEIGHT,
                          height: SUB_ROW_HEIGHT - 4,
                        }}
                        onMouseDown={(e) =>
                          handleItemMouseDown(e, item, "move")
                        }
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        {/* Resize handle - start */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-l transition-opacity"
                          onMouseDown={(e) =>
                            handleItemMouseDown(e, item, "resize-start")
                          }
                        />

                        {/* Item content */}
                        <div className="absolute inset-x-2 inset-y-0 flex items-center overflow-hidden">
                          <span className="text-xs font-medium text-primary-foreground truncate">
                            {item.label}
                          </span>
                        </div>

                        {/* Resize handle - end */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-r transition-opacity"
                          onMouseDown={(e) =>
                            handleItemMouseDown(e, item, "resize-end")
                          }
                        />
                      </div>
                    );
                  })}

                  {/* Drawing Preview */}
                  {drawingPreview && drawingPreview.laneId === lane.id && (
                    <DrawingPreview
                      startTime={drawingPreview.startTime}
                      timeToPixel={(t) => timeToPixel(t) - SIDEBAR_WIDTH}
                      laneIndex={laneIndex}
                      containerRef={containerRef}
                      pixelsPerMinute={pixelsPerMinute}
                      scrollOffset={scrollOffset}
                      snapTime={snapTime}
                      existingItems={itemsWithRows}
                      onPreviewUpdate={(_start, _end, row) => {
                        setPreviewRow({ laneId: lane.id, row });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current time indicator (now line) */}
        {(() => {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const x = timeToPixel(nowMinutes);
          if (
            x < SIDEBAR_WIDTH ||
            x > (containerRef.current?.clientWidth || 2000)
          )
            return null;

          return (
            <div
              className="absolute top-6 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
              style={{ left: x }}
            >
              <div className="absolute top-0 -translate-x-1/2 w-2.5 h-2.5 bg-destructive rounded-full" />
            </div>
          );
        })()}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 h-8 border-t border-border bg-card text-xs text-muted-foreground">
        <span>
          {items.length} events across {lanes.length} tracks
        </span>
        <div className="flex items-center gap-4">
          {selectedItemId &&
            (() => {
              const item = items.find((i) => i.id === selectedItemId);
              if (!item) return null;
              return (
                <span>
                  {item.label}: {formatTime(item.start)} -{" "}
                  {formatTime(item.end)}
                </span>
              );
            })()}
          <span className="text-muted-foreground/60">
            Press Delete to remove selected
          </span>
        </div>
      </div>
    </div>
  );
}

// Drawing Preview Component
function DrawingPreview({
  startTime,
  timeToPixel,
  laneIndex,
  containerRef,
  pixelsPerMinute,
  scrollOffset,
  snapTime,
  existingItems,
  onPreviewUpdate,
}: {
  startTime: number;
  timeToPixel: (time: number) => number;
  laneIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerMinute: number;
  scrollOffset: number;
  snapTime: (time: number) => number;
  existingItems: (TimelineItem & { row: number })[];
  onPreviewUpdate: (start: number, end: number, row: number) => void;
}) {
  // Initialize with the start position so it doesn't flash from -infinity
  const initialRect = containerRef.current?.getBoundingClientRect();
  const initialX = initialRect
    ? timeToPixel(startTime) + initialRect.left + SIDEBAR_WIDTH
    : 0;
  const [currentX, setCurrentX] = useState(initialX);

  useEffect(() => {
    const handleMove = (e: globalThis.MouseEvent) => {
      setCurrentX(e.clientX);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Convert screen X to container-relative X
  const rect = containerRef.current?.getBoundingClientRect();
  const containerX = rect ? currentX - rect.left : currentX;
  const currentTime = snapTime(
    (containerX - SIDEBAR_WIDTH - scrollOffset) / pixelsPerMinute,
  );
  const previewStart = Math.min(startTime, currentTime);
  const previewEnd = Math.max(startTime, currentTime);

  // Calculate row based on collision with existing items
  const calculateRow = () => {
    let row = 0;
    let foundRow = false;
    while (!foundRow) {
      const hasOverlap = existingItems.some(
        (placed) =>
          placed.row === row &&
          !(previewEnd <= placed.start || previewStart >= placed.end),
      );
      if (!hasOverlap) {
        foundRow = true;
      } else {
        row++;
      }
    }
    return row;
  };

  const row = calculateRow();

  // Report preview position for parent to use in collision calculations
  const prevValuesRef = useRef<{
    start: number;
    end: number;
    row: number;
  } | null>(null);
  const onPreviewUpdateRef = useRef(onPreviewUpdate);

  // Keep the ref updated
  useEffect(() => {
    onPreviewUpdateRef.current = onPreviewUpdate;
  }, [onPreviewUpdate]);

  useEffect(() => {
    // Only update if values actually changed
    if (
      !prevValuesRef.current ||
      prevValuesRef.current.start !== previewStart ||
      prevValuesRef.current.end !== previewEnd ||
      prevValuesRef.current.row !== row
    ) {
      prevValuesRef.current = { start: previewStart, end: previewEnd, row };
      onPreviewUpdateRef.current(previewStart, previewEnd, row);
    }
  }, [previewStart, previewEnd, row]);

  const left = timeToPixel(previewStart);
  const right = timeToPixel(previewEnd);
  const naturalWidth = right - left;
  const MIN_VISIBLE_WIDTH = 3;
  const isMinWidth = naturalWidth < MIN_VISIBLE_WIDTH;
  const width = Math.max(naturalWidth, MIN_VISIBLE_WIDTH);

  const color = ITEM_COLORS[laneIndex % ITEM_COLORS.length];

  return (
    <div
      className={cn(
        "absolute rounded opacity-60",
        color,
        isMinWidth && "ring-1 ring-foreground/80",
      )}
      style={{
        left,
        width,
        top: 8 + row * SUB_ROW_HEIGHT,
        height: SUB_ROW_HEIGHT - 4,
      }}
    />
  );
}
