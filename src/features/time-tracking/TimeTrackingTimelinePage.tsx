import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import type { TimeEntry } from "@/api/time-entry/time-entry.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { TagMultiSelect } from "@/features/time-tracking/_common/TagMultiSelect.tsx";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import { cn } from "@/lib/utils.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  InfiniteTimeline,
  type TimelineItem,
  useSyncTimelineAtoms,
  useTimelineRangeShadingFromPreference,
  useTimelineState,
  composeRangeLayersToPaintSegments,
  minuteRangesFromViewportShadow,
  nightWeekendViewportShadowsForShadingState,
  TIMELINE_RANGE_LAYER_PRIORITY,
  type TimelineRangePaintLayer,
  type TimelineTimeRangeShadow,
} from "@/platform/passionware-timeline/passionware-timeline.tsx";
import type {
  Lane,
  VisibleTimelineLaneRow,
} from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import type { DefaultTimelineItemProps } from "@/platform/passionware-timeline/timeline-default-item.tsx";
import {
  ITEM_COLORS,
  SUB_ROW_HEIGHT,
  zonedDateTimeToMinutes,
} from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { unionMinuteRanges } from "@/platform/passionware-timeline/timeline-minute-range-set.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { rd } from "@passionware/monads";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Cross-contractor day timeline.
 *
 * Renders time entries for a single chosen day using the shared
 * Passionware infinite timeline primitive (see `TmetricLiveContractorsTimeline`
 * for the twin widget — same platform bits, different data source).
 * We prefer this over a hand-rolled grid because it gives us:
 *   - pan / zoom / snap out of the box,
 *   - stacked items in a lane when entries overlap,
 *   - the shared "night / weekend / clamp" shading treatment,
 *   - a consistent look with the rest of the tracker.
 *
 * One lane per contractor; one item per `TimeEntry` started on the
 * selected day (we clamp to `[start_of_day, end_of_day]` so the lane
 * geometry is stable even when entries span midnight — the server
 * query already scopes by `started_from` / `started_to`).
 *
 * Out of scope (separate todos):
 *   - week / month range zoom → already supported by the platform view,
 *     but we currently fix the viewport to the chosen day for UX clarity.
 *   - jump-on lineage chips (`jump_on_mode`).
 */
export function TimeTrackingTimelinePage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const [day, setDay] = useState(() => startOfLocalDay(new Date()));
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"any" | "all">("any");

  const baseQuery = useMemo(() => {
    const startedTo = new Date(day);
    startedTo.setDate(startedTo.getDate() + 1);
    return {
      workspaceId: idSpecUtils.mapSpecificOrElse(
        props.workspaceId,
        (id) => id as number,
        undefined,
      ),
      clientId: idSpecUtils.mapSpecificOrElse(
        props.clientId,
        (id) => id as number,
        undefined,
      ),
      startedFrom: day,
      startedTo,
      limit: 1000,
    };
  }, [day, props.workspaceId, props.clientId]);

  const filteredQuery = useMemo(
    () => ({
      ...baseQuery,
      tags: tagFilter.length > 0 ? tagFilter : undefined,
      tagsMode: tagFilter.length > 0 ? tagMode : undefined,
    }),
    [baseQuery, tagFilter, tagMode],
  );

  // Two queries: the visible entries (tag-filtered) and the suggestion
  // pool (unfiltered for the same day) so the popover always shows
  // every tag logged that day, not just the ones still visible.
  const entries = props.services.timeEntryService.useEntries(filteredQuery);
  const dayEntries = props.services.timeEntryService.useEntries(baseQuery);
  const contractors = props.services.contractorService.useContractors(
    useMemo(() => contractorQueryUtils.ofEmpty(), []),
  );
  const projects = props.services.projectService.useProjects(
    useMemo(() => projectQueryUtils.ofDefault(), []),
  );
  const availableTags = useMemo(() => {
    const list = rd.tryGet(dayEntries) ?? [];
    const counts = new Map<string, { count: number; lastUsedAt: Date }>();
    for (const e of list) {
      if (e.deletedAt !== null) continue;
      for (const t of e.tags) {
        const existing = counts.get(t);
        if (existing) {
          existing.count += 1;
          if (e.startedAt > existing.lastUsedAt) existing.lastUsedAt = e.startedAt;
        } else {
          counts.set(t, { count: 1, lastUsedAt: e.startedAt });
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, v]) => ({ tag, count: v.count, lastUsedAt: v.lastUsedAt }))
      .sort((a, b) => b.count - a.count);
  }, [dayEntries]);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink
          workspaceId={props.workspaceId}
          services={props.services}
        />,
        <ClientBreadcrumbLink
          clientId={props.clientId}
          services={props.services}
        />,
        <BreadcrumbPage>Time tracking</BreadcrumbPage>,
        <BreadcrumbPage>Timeline</BreadcrumbPage>,
      ]}
    >
      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0">
          <div className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">
              {format(day, "EEEE, d MMMM yyyy")}
            </CardTitle>
            <DayNav day={day} onChange={setDay} />
          </div>
          <TagFilterRow
            value={tagFilter}
            onChange={setTagFilter}
            mode={tagMode}
            onModeChange={setTagMode}
            available={availableTags}
          />
        </CardHeader>
        <CardContent>
          {rd
            .journey(entries)
            .wait(<Skeleton className="h-72 w-full" />)
            .catch(renderError)
            .map((list) => (
              <TimelineBody
                services={props.services}
                day={day}
                entries={list}
                contractorNames={
                  rd.tryGet(contractors)
                    ? new Map(
                        rd.tryGet(contractors)!.map((c) => [c.id, c.fullName]),
                      )
                    : new Map()
                }
                projectNames={
                  rd.tryGet(projects)
                    ? new Map(
                        rd.tryGet(projects)!.map((p) => [p.id, p.name]),
                      )
                    : new Map()
                }
              />
            ))}
        </CardContent>
      </Card>
    </CommonPageContainer>
  );
}

function TagFilterRow(props: {
  value: string[];
  onChange: (next: string[]) => void;
  mode: "any" | "all";
  onModeChange: (next: "any" | "all") => void;
  available: import("@/services/io/TimeEntryService/TimeEntryService.ts").TagSuggestion[];
}) {
  const hasAnyTagsToday = props.available.length > 0;
  const hasSelection = props.value.length > 0;
  if (!hasAnyTagsToday && !hasSelection) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Filter by tags:</span>
      <TagMultiSelect
        value={props.value}
        onChange={props.onChange}
        suggestions={props.available}
        showHelp={false}
        placeholder="Filter tag…"
        max={16}
      />
      {props.value.length > 1 ? (
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            size="sm"
            variant={props.mode === "any" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => props.onModeChange("any")}
          >
            Any
          </Button>
          <Button
            size="sm"
            variant={props.mode === "all" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => props.onModeChange("all")}
          >
            All
          </Button>
        </div>
      ) : null}
      {hasSelection ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          onClick={() => props.onChange([])}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}

function DayNav(props: { day: Date; onChange: (next: Date) => void }) {
  const today = startOfLocalDay(new Date());
  const isToday = props.day.getTime() === today.getTime();
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => props.onChange(addDays(props.day, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => props.onChange(today)}
        disabled={isToday}
      >
        Today
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => props.onChange(addDays(props.day, 1))}
        disabled={isToday}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

type EntryBarData = {
  entry: TimeEntry;
  contractorName: string;
  projectName: string;
  startMs: number;
  endMs: number;
  isRunning: boolean;
};

type EntryLaneMeta = {
  contractorId: number;
  contractorName: string;
};

function TimelineBody(
  props: WithFrontServices & {
    day: Date;
    entries: TimeEntry[];
    contractorNames: Map<number, string>;
    projectNames: Map<number, string>;
  },
) {
  const timeZone = getLocalTimeZone();

  const { lanes, items } = useMemo(() => {
    const dayStartMs = props.day.getTime();
    const dayEndMs = dayStartMs + 24 * 3600 * 1000;
    const nowMs = Date.now();

    // Group entries by contractor so each contractor gets a single lane
    // even when they have dozens of entries on the day.
    const byContractor = new Map<number, TimeEntry[]>();
    for (const e of props.entries) {
      const arr = byContractor.get(e.contractorId);
      if (arr) arr.push(e);
      else byContractor.set(e.contractorId, [e]);
    }

    // Stable row order: contractor name ascending, fallback to id so the
    // rows don't reorder between renders when the name map is still loading.
    const sortedContractorIds = Array.from(byContractor.keys()).sort((a, b) => {
      const nameA = props.contractorNames.get(a) ?? `Contractor ${a}`;
      const nameB = props.contractorNames.get(b) ?? `Contractor ${b}`;
      return nameA.localeCompare(nameB);
    });

    const lanesOut: Lane<EntryLaneMeta>[] = [];
    const itemsOut: TimelineItem<EntryBarData>[] = [];

    sortedContractorIds.forEach((contractorId, laneIndex) => {
      const laneId = String(contractorId);
      const contractorName =
        props.contractorNames.get(contractorId) ?? `Contractor ${contractorId}`;
      // Lane colour is advisory (shows in the legend dot / default bars);
      // per-item colour below overrides for bars so projects stay visually
      // distinguishable even inside one lane.
      const laneColor = ITEM_COLORS[laneIndex % ITEM_COLORS.length];

      lanesOut.push({
        id: laneId,
        name: contractorName,
        color: laneColor,
        meta: { contractorId, contractorName },
      });

      const rows = byContractor.get(contractorId)!;
      for (const entry of rows) {
        const startMs = Math.max(entry.startedAt.getTime(), dayStartMs);
        const stoppedAtMs = (entry.stoppedAt ?? new Date(nowMs)).getTime();
        const endMs = Math.min(stoppedAtMs, dayEndMs);
        if (endMs <= startMs) continue;

        const projectName =
          props.projectNames.get(entry.projectId) ??
          `Project ${entry.projectId}`;

        itemsOut.push({
          id: entry.id,
          laneId,
          start: fromAbsolute(startMs, timeZone),
          end: fromAbsolute(endMs, timeZone),
          label: entry.description?.trim() ? entry.description : projectName,
          color: projectColour(entry.projectId),
          data: {
            entry,
            contractorName,
            projectName,
            startMs,
            endMs,
            isRunning: entry.stoppedAt === null,
          },
        });
      }
    });

    return { lanes: lanesOut, items: itemsOut };
  }, [props.day, props.entries, props.contractorNames, props.projectNames, timeZone]);

  const viewportRange = useMemo(() => {
    const startMs = props.day.getTime();
    const endMs = startMs + 24 * 3600 * 1000;
    return {
      start: fromAbsolute(startMs, timeZone),
      end: fromAbsolute(endMs, timeZone),
    };
  }, [props.day, timeZone]);

  const { rangeShadingState, onRangeShadingStateChange } =
    useTimelineRangeShadingFromPreference(
      props.services.preferenceService,
      "timeline-range-shading:time-tracking-timeline",
      { night: true, weekend: false },
    );

  const clampClass = "bg-zinc-500/20";
  const nightClass = "bg-zinc-900/5";
  const weekendClass = "bg-sky-800/15";

  const nightViewportShadowsOnly = useMemo(
    () =>
      nightWeekendViewportShadowsForShadingState(
        { night: rangeShadingState.night, weekend: false },
        { night: nightClass, weekend: weekendClass },
      ),
    [rangeShadingState.night],
  );

  const weekendViewportShadowsOnly = useMemo(
    () =>
      nightWeekendViewportShadowsForShadingState(
        { night: false, weekend: rangeShadingState.weekend },
        { night: nightClass, weekend: weekendClass },
      ),
    [rangeShadingState.weekend],
  );

  // Same composition the other tracker timelines use: anything outside
  // the chosen day is clamp-shaded, then weekend, then night on top.
  const timeRangeShadows = useMemo((): TimelineTimeRangeShadow[] => {
    const dayStartMs = props.day.getTime();
    const dayEndMs = dayStartMs + 24 * 3600 * 1000;
    return [
      {
        kind: "viewport" as const,
        resolve: (ctx) => {
          const lo = Math.min(ctx.visibleStartMinutes, ctx.visibleEndMinutes);
          const hi = Math.max(ctx.visibleStartMinutes, ctx.visibleEndMinutes);
          // Shade everything outside the chosen day with the shared
          // "clamp" layer — same technique TmetricLive uses for the last-24h
          // and CubeTimelineView for the subrange clamp.
          const dayStartMinutes = zonedDateTimeToMinutes(
            fromAbsolute(dayStartMs, ctx.timeZone),
            ctx.baseDateZoned,
          );
          const dayEndMinutes = zonedDateTimeToMinutes(
            fromAbsolute(dayEndMs, ctx.timeZone),
            ctx.baseDateZoned,
          );
          const clampRanges = unionMinuteRanges([
            { start: lo, end: Math.min(dayStartMinutes, hi) },
            { start: Math.max(dayEndMinutes, lo), end: hi },
          ]);

          const nightRaw = minuteRangesFromViewportShadow(
            nightViewportShadowsOnly[0],
            ctx,
          );
          const weekendRaw = minuteRangesFromViewportShadow(
            weekendViewportShadowsOnly[0],
            ctx,
          );

          const layers: TimelineRangePaintLayer[] = [
            {
              id: "clamp",
              priority: TIMELINE_RANGE_LAYER_PRIORITY.clamp,
              className: clampClass,
              ranges: clampRanges,
            },
            {
              id: "weekend",
              priority: TIMELINE_RANGE_LAYER_PRIORITY.weekend,
              className: weekendClass,
              ranges: weekendRaw,
            },
            {
              id: "night",
              priority: TIMELINE_RANGE_LAYER_PRIORITY.night,
              className: nightClass,
              ranges: nightRaw,
            },
          ];
          return composeRangeLayersToPaintSegments(layers);
        },
      },
    ];
  }, [
    props.day,
    nightViewportShadowsOnly,
    weekendViewportShadowsOnly,
  ]);

  const timelineState = useTimelineState<EntryBarData, EntryLaneMeta>({
    defaultSnapOption: "15min",
  });

  useSyncTimelineAtoms(timelineState, {
    items,
    lanes,
    timeZone,
    expandedLaneIds: null,
  });

  if (props.entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No entries logged on this day.
      </div>
    );
  }

  const renderLaneLabel = (lane: VisibleTimelineLaneRow<EntryLaneMeta>) => (
    <div className="flex min-w-0 items-center gap-2 px-2 py-1">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
          lane.color,
        )}
        aria-hidden
      />
      <span className="min-w-0 truncate text-xs font-medium leading-tight">
        {lane.meta?.contractorName ?? lane.name}
      </span>
    </div>
  );

  return (
    <div className="h-[min(65vh,32rem)] min-h-[18rem] overflow-hidden rounded-lg border border-border/60 bg-background">
      <InfiniteTimeline<EntryBarData, EntryLaneMeta>
        state={timelineState}
        embedded
        hideLaneControls
        renderLaneLabel={renderLaneLabel}
        interactionOptions={{
          viewportRange,
          itemActivateTrigger: "click",
        }}
        timeRangeShadows={timeRangeShadows}
        rangeShadingState={rangeShadingState}
        onRangeShadingStateChange={onRangeShadingStateChange}
        renderItem={(itemProps) => <TimeEntryBar {...itemProps} />}
      />
    </div>
  );
}

function TimeEntryBar(props: DefaultTimelineItemProps<EntryBarData>) {
  const { item, left, width } = props;
  const entry = item.data.entry;
  const isDeleted = entry.deletedAt !== null;
  const trigger = (
    <div
      data-timeline-item
      role="button"
      tabIndex={0}
      className={cn(
        "pointer-events-auto absolute flex cursor-pointer items-center overflow-hidden rounded-md border px-1 text-left text-primary-foreground shadow-sm outline-none ring-offset-background hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isDeleted
          ? "border-dashed border-muted-foreground/40 bg-muted-foreground/10 text-muted-foreground"
          : cn(item.color ?? "bg-primary", "border-black/10"),
        item.data.isRunning && "ring-2 ring-emerald-400",
      )}
      style={{
        left,
        width: Math.max(width, 6),
        top: 8 + (item.row ?? 0) * SUB_ROW_HEIGHT,
        height: SUB_ROW_HEIGHT - 4,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <span className="min-w-0 flex-1 truncate px-0.5 text-[10px] font-medium leading-tight">
        {item.label}
      </span>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-[min(22rem,calc(100vw-2rem))] max-w-[min(22rem,calc(100vw-2rem))] p-3"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EntryPopoverBody item={item} />
      </PopoverContent>
    </Popover>
  );
}

function EntryPopoverBody({ item }: { item: TimelineItem<EntryBarData> }) {
  const d = item.data;
  const durationSec = Math.floor((d.endMs - d.startMs) / 1000);
  return (
    <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone="secondary"
          variant={d.isRunning ? "success" : "neutral"}
          className="shrink-0 text-[10px] leading-none"
        >
          {d.isRunning ? "Running" : "Stopped"}
        </Badge>
        {d.entry.isPlaceholder ? (
          <Badge
            tone="secondary"
            variant="warning"
            className="shrink-0 text-[10px] leading-none"
          >
            Needs detail
          </Badge>
        ) : null}
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
          {d.entry.approvalState}
        </span>
      </div>
      <div className="space-y-0.5 text-xs">
        <p className="font-medium leading-tight text-foreground">
          {d.entry.description?.trim() ?? d.projectName}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {d.contractorName} · {d.projectName}
        </p>
      </div>
      <Separator />
      <dl className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide">
            Start
          </dt>
          <dd className="tabular-nums text-foreground">
            {format(new Date(d.startMs), "HH:mm")}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide">
            End
          </dt>
          <dd className="tabular-nums text-foreground">
            {d.isRunning ? "running" : format(new Date(d.endMs), "HH:mm")}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide">
            Duration
          </dt>
          <dd className="font-medium text-foreground">
            {formatElapsedSeconds(durationSec)}
          </dd>
        </div>
      </dl>
      {d.entry.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {d.entry.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Stable per-project chart palette. Kept as Tailwind classes so item bars
// render with the same colour language the rest of the tracker uses.
const PROJECT_COLOURS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

function projectColour(projectId: number): string {
  return PROJECT_COLOURS[projectId % PROJECT_COLOURS.length];
}

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
