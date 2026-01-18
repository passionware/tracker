import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate";
import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";
import { BarChart3, Clock, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

interface TimelineEntry {
  id: string;
  startTime: Date;
  endTime: Date;
  taskId: string;
  taskName: string;
  activityId: string;
  activityName: string;
  roleId: string;
  roleName: string;
  contractorId: number;
  contractorName?: string;
  note: string | null;
  duration: number;
  costRate: number;
  costCurrency: string;
  billingRate: number;
  billingCurrency: string;
}

interface TimelineVisualizationProps {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
}

export function AdvancedTimelineVisualization({
  report,
  services,
}: TimelineVisualizationProps) {
  const [selectedContractors, setSelectedContractors] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [, setScrollPosition] = useState({ x: 0, y: 0 });
  const timelineRef = useRef<HTMLDivElement>(null);

  // Transform time entries into timeline data
  const timelineEntries: TimelineEntry[] = useMemo(() => {
    return report.data.timeEntries.map((entry) => {
      const roleType = report.data.definitions.roleTypes[entry.roleId];
      const taskType = report.data.definitions.taskTypes[entry.taskId];
      const activityType =
        report.data.definitions.activityTypes[entry.activityId];

      const matchingRate = getMatchingRate(report.data, entry);

      const duration =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);

      return {
        id: entry.id,
        startTime: entry.startAt,
        endTime: entry.endAt,
        taskId: entry.taskId,
        taskName: taskType?.name || "Unknown Task",
        activityId: entry.activityId,
        activityName: activityType?.name || "Unknown Activity",
        roleId: entry.roleId,
        roleName: roleType?.name || "Unknown Role",
        contractorId: entry.contractorId,
        note: entry.note,
        duration,
        costRate: matchingRate?.costRate || 0,
        costCurrency: matchingRate?.costCurrency || "EUR",
        billingRate: matchingRate?.billingRate || 0,
        billingCurrency: matchingRate?.billingCurrency || "EUR",
      };
    });
  }, [report]);

  const activities = useMemo(() => {
    const unique = new Map();
    timelineEntries.forEach((entry) => {
      if (!unique.has(entry.activityId)) {
        unique.set(entry.activityId, {
          id: entry.activityId,
          name: entry.activityName,
        });
      }
    });
    return Array.from(unique.values());
  }, [timelineEntries]);

  // Filter entries based on selected contractors
  const filteredEntries = useMemo(() => {
    if (selectedContractors.length === 0) return timelineEntries;

    return timelineEntries.filter((entry) =>
      selectedContractors.includes(entry.contractorId),
    );
  }, [timelineEntries, selectedContractors]);

  // Calculate timeline bounds based on view mode
  const timelineBounds = useMemo(() => {
    if (filteredEntries.length === 0)
      return { start: currentDate, end: addDays(currentDate, 1) };

    let start: Date, end: Date;

    switch (viewMode) {
      case "day":
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case "week":
        const dayOfWeek = currentDate.getDay();
        start = startOfDay(subDays(currentDate, dayOfWeek));
        end = endOfDay(addDays(start, 6));
        break;
      case "month":
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        );
        break;
      default:
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
    }

    return { start, end };
  }, [filteredEntries, currentDate, viewMode]);

  // Generate time slots for the timeline
  const timeSlots = useMemo(() => {
    const slots = [];
    const start = timelineBounds.start;
    const end = timelineBounds.end;

    if (viewMode === "day") {
      // Hourly slots for day view
      for (let hour = 0; hour < 24; hour++) {
        const time = new Date(start);
        time.setHours(hour, 0, 0, 0);
        slots.push(time);
      }
    } else if (viewMode === "week") {
      // Daily slots for week view
      for (let day = 0; day < 7; day++) {
        const time = new Date(start);
        time.setDate(start.getDate() + day);
        slots.push(time);
      }
    } else {
      // Daily slots for month view (limited to first 31 days)
      const daysInMonth = Math.min(
        31,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      for (let day = 0; day < daysInMonth; day++) {
        const time = new Date(start);
        time.setDate(start.getDate() + day);
        if (time <= end) {
          slots.push(time);
        }
      }
    }

    return slots;
  }, [timelineBounds, viewMode]);

  // Generate timeline rows (group by contractor)
  const timelineRows = useMemo(() => {
    const grouped = new Map<number, TimelineEntry[]>();
    filteredEntries.forEach((entry) => {
      if (!grouped.has(entry.contractorId)) {
        grouped.set(entry.contractorId, []);
      }
      grouped.get(entry.contractorId)!.push(entry);
    });

    return Array.from(grouped.entries()).map(([contractorId, entries]) => ({
      contractorId,
      entries: entries.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime(),
      ),
    }));
  }, [filteredEntries]);

  // Color palette for different activity types
  const getActivityColor = (activityId: string) => {
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#84cc16",
      "#f97316",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
      "#f43f5e",
      "#8b5a2b",
      "#7c3aed",
      "#dc2626",
    ];
    const hash = activityId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Zoom and scroll handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setScrollPosition({ x: 0, y: 0 });
  }, []);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollPosition({
      x: target.scrollLeft,
      y: target.scrollTop,
    });
  }, []);

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === "day") {
      setCurrentDate(subDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subDays(currentDate, 7));
    } else {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      );
    }
  };

  const goToNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      );
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Timeline Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPrevious}>
                  ← Previous
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={goToNext}>
                  Next →
                </Button>
              </div>

              <div className="text-lg font-semibold">
                {viewMode === "day" &&
                  format(currentDate, "EEEE, MMMM do, yyyy")}
                {viewMode === "week" &&
                  `${format(timelineBounds.start, "MMM dd")} - ${format(timelineBounds.end, "MMM dd, yyyy")}`}
                {viewMode === "month" && format(currentDate, "MMMM yyyy")}
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                >
                  Month
                </Button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Zoom:</span>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-500">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>

            {/* Contractor Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Contractors:</span>
              <ContractorMultiPicker
                size="sm"
                services={services}
                value={selectedContractors}
                onSelect={(ids) => {
                  setSelectedContractors(
                    ids.filter((id): id is number => typeof id === "number"),
                  );
                }}
                query={contractorQueryUtils.ofEmpty()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt-style Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gantt Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea
            className="h-96 w-full border rounded-lg"
            onScrollCapture={handleScroll}
          >
            <div
              ref={timelineRef}
              className="min-w-[800px] p-4"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
                minWidth: `${800 * zoomLevel}px`,
              }}
            >
              {/* Timeline Header */}
              <div className="flex border-b-2 border-slate-200 mb-4">
                <div className="w-48 p-3 font-semibold text-slate-700 bg-slate-50 border-r">
                  Contractor
                </div>
                <div className="flex-1 flex">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex-1 p-2 text-center text-sm font-medium text-slate-600 border-r border-slate-200"
                    >
                      {viewMode === "day" && format(slot, "HH:mm")}
                      {viewMode === "week" && format(slot, "EEE")}
                      {viewMode === "month" && format(slot, "dd")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Rows */}
              <div className="space-y-1">
                {timelineRows.map(({ contractorId, entries }) => (
                  <div
                    key={contractorId}
                    className="flex border-b border-slate-100 hover:bg-slate-50"
                  >
                    {/* Contractor Name with Widget */}
                    <div className="w-48 p-3 flex items-center gap-2 bg-slate-50 border-r">
                      <ContractorWidget
                        contractorId={contractorId}
                        services={services}
                        size="sm"
                      />
                    </div>

                    {/* Timeline Grid */}
                    <div className="flex-1 flex relative">
                      {timeSlots.map((slot, slotIndex) => (
                        <div
                          key={slotIndex}
                          className="flex-1 h-16 border-r border-slate-200 relative"
                        >
                          {/* Time entries for this slot */}
                          {entries
                            .filter((entry) => {
                              if (viewMode === "day") {
                                return (
                                  entry.startTime.getHours() ===
                                    slot.getHours() ||
                                  (entry.startTime <= slot &&
                                    entry.endTime > slot)
                                );
                              } else if (viewMode === "week") {
                                return (
                                  isSameDay(entry.startTime, slot) ||
                                  (entry.startTime <= slot &&
                                    entry.endTime >= slot)
                                );
                              } else {
                                return (
                                  isSameDay(entry.startTime, slot) ||
                                  (entry.startTime <= slot &&
                                    entry.endTime >= slot)
                                );
                              }
                            })
                            .map((entry, entryIndex) => {
                              const isStart =
                                viewMode === "day"
                                  ? entry.startTime.getHours() ===
                                    slot.getHours()
                                  : isSameDay(entry.startTime, slot);

                              if (!isStart) return null;

                              const slotDuration = viewMode === "day" ? 1 : 1; // hours or days
                              const entryDuration = entry.duration;
                              const widthPercent = Math.min(
                                (entryDuration / slotDuration) * 100,
                                100,
                              );

                              return (
                                <div
                                  key={`${entry.id}-${entryIndex}`}
                                  className="absolute top-1 left-1 right-1 h-6 rounded cursor-pointer group overflow-hidden"
                                  style={{
                                    width: `${Math.max(widthPercent * 0.8, 20)}%`,
                                    backgroundColor: getActivityColor(
                                      entry.activityId,
                                    ),
                                  }}
                                  title={`${entry.taskName} - ${entry.activityName}\n${format(entry.startTime, "HH:mm")} - ${format(entry.endTime, "HH:mm")}\n${entry.duration.toFixed(1)}h\n${services.formatService.financial.amount(entry.duration * entry.costRate, entry.costCurrency)}`}
                                >
                                  <div className="h-full w-full bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white text-shadow">
                                    {entry.duration.toFixed(1)}h
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Activity Types</h4>
            <div className="flex flex-wrap gap-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getActivityColor(activity.id) }}
                  />
                  <span className="text-sm">{activity.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredEntries.length}
              </div>
              <div className="text-sm text-slate-600">Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredEntries
                  .reduce((sum, entry) => sum + entry.duration, 0)
                  .toFixed(1)}
                h
              </div>
              <div className="text-sm text-slate-600">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {timelineRows.length}
              </div>
              <div className="text-sm text-slate-600">Contractors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(filteredEntries.map((e) => e.taskId)).size}
              </div>
              <div className="text-sm text-slate-600">Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
