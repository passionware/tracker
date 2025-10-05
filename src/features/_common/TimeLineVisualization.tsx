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
import { endOfDay, format, startOfDay } from "date-fns";
import { Calendar, Clock, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
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
  note: string;
  duration: number; // in hours
  costRate: number;
  costCurrency: string;
  billingRate: number;
  billingCurrency: string;
}

interface TimelineVisualizationProps {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
}

export function TimelineVisualization({
  report,
  services,
}: TimelineVisualizationProps) {
  const [selectedContractors, setSelectedContractors] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
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

      const matchingRate =
        roleType?.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        ) || roleType?.rates[0];

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

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (filteredEntries.length === 0)
      return { start: new Date(), end: new Date() };

    const start = new Date(
      Math.min(...filteredEntries.map((e) => e.startTime.getTime())),
    );
    const end = new Date(
      Math.max(...filteredEntries.map((e) => e.endTime.getTime())),
    );

    return { start: startOfDay(start), end: endOfDay(end) };
  }, [filteredEntries]);

  // Generate timeline rows (group by contractor for now)
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

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* View Mode */}
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

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entries Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Timeline Header */}
            <div className="flex items-center justify-between text-sm font-medium text-slate-600 border-b pb-2">
              <div className="w-48">Contractor</div>
              <div className="flex-1 text-center">
                {format(timelineBounds.start, "MMM dd")} -{" "}
                {format(timelineBounds.end, "MMM dd, yyyy")}
              </div>
              <div className="w-24 text-right">Duration</div>
            </div>

            {/* Zoomable and Scrollable Timeline */}
            <ScrollArea
              className="h-96 w-full border rounded-lg"
              onScrollCapture={handleScroll}
            >
              <div
                ref={timelineRef}
                className="space-y-2 p-4"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  minWidth: `${100 * zoomLevel}%`,
                }}
              >
                {timelineRows.map(({ contractorId, entries }) => (
                  <div
                    key={contractorId}
                    className="flex items-center gap-4 py-2 border-b border-slate-100"
                  >
                    {/* Contractor Name with Widget */}
                    <div className="w-48 flex items-center gap-2">
                      <ContractorWidget
                        contractorId={contractorId}
                        services={services}
                        size="sm"
                      />
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                      {entries.map((entry, index) => {
                        const totalDuration =
                          timelineBounds.end.getTime() -
                          timelineBounds.start.getTime();
                        const entryStart =
                          entry.startTime.getTime() -
                          timelineBounds.start.getTime();
                        const entryDuration =
                          entry.endTime.getTime() - entry.startTime.getTime();

                        const leftPercent = (entryStart / totalDuration) * 100;
                        const widthPercent =
                          (entryDuration / totalDuration) * 100;

                        return (
                          <div
                            key={`${entry.id}-${index}`}
                            className="absolute h-full rounded cursor-pointer group"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${Math.max(widthPercent, 1)}%`,
                              backgroundColor: getActivityColor(
                                entry.activityId,
                              ),
                            }}
                            title={`${entry.taskName} - ${entry.activityName}\n${format(entry.startTime, "HH:mm")} - ${format(entry.endTime, "HH:mm")}\n${entry.duration.toFixed(1)}h - ${services.formatService.financial.amount(entry.duration * entry.costRate, entry.costCurrency)}`}
                          >
                            <div className="h-full w-full bg-gradient-to-r from-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Duration */}
                    <div className="w-24 text-right text-sm font-medium">
                      {entries
                        .reduce((sum, entry) => sum + entry.duration, 0)
                        .toFixed(1)}
                      h
                    </div>
                  </div>
                ))}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
