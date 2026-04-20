import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import type { TimeEntry } from "@/api/time-entry/time-entry.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { TagMultiSelect } from "@/features/time-tracking/_common/TagMultiSelect.tsx";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import { cn } from "@/lib/utils.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const HOURS = 24;
const HOUR_PX = 32; // narrow but readable; 24 * 32 = 768px wide ribbon

/**
 * Cross-contractor day timeline.
 *
 * Lays out one row per contractor and one column per hour-of-day for a
 * pickable day (default: today). Time entries are positioned by their
 * `startedAt` / `stoppedAt` and coloured per-project so visual scanning
 * surfaces "Alice spent the morning on Project A; Bob jumped between
 * three things". Hovering an entry shows full detail in a tooltip.
 *
 * Filters that ride for free: workspace + client come from the
 * breadcrumb, contractor stays implicit via the projection (we render
 * every contractor that has at least one entry on the chosen day).
 *
 * Out of scope (separate todos):
 *   - week / month range zoom (timeline_and_tasks_pages will follow up)
 *   - jump-on lineage chips (`jump_on_mode`)
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
    contractorQueryUtils.ofEmpty(),
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
              <TimelineGrid
                day={day}
                entries={list}
                contractorNames={
                  rd.tryGet(contractors)
                    ? new Map(
                        rd.tryGet(contractors)!.map((c) => [c.id, c.fullName]),
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

function TimelineGrid(props: {
  day: Date;
  entries: TimeEntry[];
  contractorNames: Map<number, string>;
}) {
  // Group entries by contractor so each contractor gets a single row.
  const rows = useMemo(() => {
    const map = new Map<number, TimeEntry[]>();
    for (const e of props.entries) {
      const arr = map.get(e.contractorId);
      if (arr) arr.push(e);
      else map.set(e.contractorId, [e]);
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    return Array.from(map.entries()).sort((a, b) => {
      // Sort rows by contractor name when known, else by id, so the page
      // doesn't reorder unpredictably between renders.
      const nameA = props.contractorNames.get(a[0]) ?? `Contractor ${a[0]}`;
      const nameB = props.contractorNames.get(b[0]) ?? `Contractor ${b[0]}`;
      return nameA.localeCompare(nameB);
    });
  }, [props.entries, props.contractorNames]);

  if (props.entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No entries logged on this day.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `9rem repeat(${HOURS}, ${HOUR_PX}px)`,
        }}
      >
        <div />
        {Array.from({ length: HOURS }).map((_, h) => (
          <div
            key={h}
            className="border-l border-border/50 px-1 text-[10px] tabular-nums text-muted-foreground"
          >
            {h.toString().padStart(2, "0")}
          </div>
        ))}
        {rows.map(([contractorId, entries]) => (
          <ContractorRow
            key={contractorId}
            day={props.day}
            entries={entries}
            label={
              props.contractorNames.get(contractorId) ??
              `Contractor ${contractorId}`
            }
          />
        ))}
      </div>
    </div>
  );
}

function ContractorRow(props: {
  day: Date;
  entries: TimeEntry[];
  label: string;
}) {
  return (
    <>
      <div className="sticky left-0 flex items-center gap-2 border-t border-border bg-card px-2 py-2 text-xs font-medium">
        {props.label}
      </div>
      <div
        className="relative col-span-24 border-t border-border"
        style={{ gridColumn: `span ${HOURS} / span ${HOURS}` }}
      >
        <div className="relative h-12">
          {Array.from({ length: HOURS }).map((_, h) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-border/40"
              style={{ left: `${h * HOUR_PX}px` }}
            />
          ))}
          {props.entries.map((entry) => (
            <EntryBlock key={entry.id} day={props.day} entry={entry} />
          ))}
        </div>
      </div>
    </>
  );
}

function EntryBlock(props: { day: Date; entry: TimeEntry }) {
  const { day, entry } = props;
  const dayStartMs = day.getTime();
  const dayEndMs = dayStartMs + 24 * 3600 * 1000;
  const startMs = Math.max(entry.startedAt.getTime(), dayStartMs);
  const stoppedAt = entry.stoppedAt ?? new Date();
  const endMs = Math.min(stoppedAt.getTime(), dayEndMs);
  if (endMs <= startMs) return null;

  const offsetSeconds = (startMs - dayStartMs) / 1000;
  const widthSeconds = (endMs - startMs) / 1000;
  const left = (offsetSeconds / 3600) * HOUR_PX;
  const width = Math.max(2, (widthSeconds / 3600) * HOUR_PX);
  const colour = projectColour(entry.projectId);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute top-1 h-10 rounded-md border text-left text-[10px] transition-colors",
            entry.deletedAt !== null
              ? "border-dashed border-muted-foreground/30 bg-muted-foreground/5 text-muted-foreground"
              : `${colour.bg} ${colour.border} hover:brightness-110`,
            entry.stoppedAt === null && "ring-2 ring-emerald-400 ring-offset-0",
          )}
          style={{ left: `${left}px`, width: `${width}px` }}
        >
          <span className="block truncate px-1 pt-0.5 font-medium leading-tight">
            {entry.description ?? `Project ${entry.projectId}`}
          </span>
          <span className="block px-1 text-[9px] tabular-nums opacity-70">
            {formatElapsedSeconds(Math.floor(widthSeconds))}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-medium">
            {entry.description ?? `Project ${entry.projectId}`}
          </span>
          <span>
            {format(entry.startedAt, "HH:mm")} –{" "}
            {entry.stoppedAt ? format(entry.stoppedAt, "HH:mm") : "running"}
          </span>
          <span className="opacity-70">
            {formatElapsedSeconds(Math.floor(widthSeconds))} ·{" "}
            {entry.approvalState}
            {entry.isPlaceholder ? " · needs detail" : ""}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const PROJECT_COLOURS = [
  { bg: "bg-sky-100", border: "border-sky-300" },
  { bg: "bg-amber-100", border: "border-amber-300" },
  { bg: "bg-emerald-100", border: "border-emerald-300" },
  { bg: "bg-violet-100", border: "border-violet-300" },
  { bg: "bg-rose-100", border: "border-rose-300" },
  { bg: "bg-cyan-100", border: "border-cyan-300" },
  { bg: "bg-orange-100", border: "border-orange-300" },
  { bg: "bg-teal-100", border: "border-teal-300" },
];

function projectColour(projectId: number) {
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
