import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import {
  GeneratedReportSource,
  generatedReportSourceQueryUtils,
} from "@/api/generated-report-source/generated-report-source.api.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { AbstractMultiPicker } from "@/features/_common/elements/pickers/_common/AbstractMultiPicker.tsx";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  EntryFilters,
  GroupedEntrySummary,
  GroupedView,
  GroupSpecifier,
} from "@/services/front/GeneratedReportViewService/GeneratedReportViewService.ts";
import { rd } from "@passionware/monads";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  GripVertical,
  Settings,
} from "lucide-react";
import { useState } from "react";

// Custom multi-pickers for role, task, and activity using report data
interface ReportEntity {
  id: string;
  name: string;
  description?: string;
}

// Role Multi Picker
function RoleMultiPicker({
  report,
  value,
  onSelect,
  ...props
}: {
  report: GeneratedReportSource;
  value: string[];
  onSelect: (value: string[]) => void;
} & Omit<
  React.ComponentProps<typeof AbstractMultiPicker<string, ReportEntity>>,
  "value" | "onSelect" | "config"
>) {
  const config = {
    renderItem: (item: Unassigned | ReportEntity) =>
      unassignedUtils.mapOrElse(
        item,
        (entity) => <div className="px-1">{entity.name}</div>,
        <div>Unassigned</div>,
      ),
    renderOption: (item: ReportEntity) => (
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        {item.description && (
          <span className="text-sm text-slate-500">{item.description}</span>
        )}
      </div>
    ),
    getItemId: (item: ReportEntity) => item.id,
    getKey: (item: ReportEntity) => item.id,
    useSelectedItems: (ids: Array<Unassigned | string>) => {
      const stringIds = ids.filter(
        (id): id is string => typeof id === "string",
      );
      const entities = stringIds.map((id) => ({
        id,
        name: report.data.definitions.roleTypes[id]?.name || id,
        description: report.data.definitions.roleTypes[id]?.description,
      }));
      return rd.of(entities);
    },
    useItems: (query: string) => {
      const entities = Object.entries(report.data.definitions.roleTypes)
        .map(([id, roleType]) => ({
          id,
          name: roleType.name,
          description: roleType.description,
        }))
        .filter(
          (entity) =>
            entity.name.toLowerCase().includes(query.toLowerCase()) ||
            entity.description?.toLowerCase().includes(query.toLowerCase()),
        );
      return rd.of(entities);
    },
    searchPlaceholder: "Search roles...",
    placeholder: "Select roles",
  };

  return (
    <AbstractMultiPicker
      {...props}
      value={value}
      onSelect={(newValue) => {
        const stringValues = newValue.filter(
          (v): v is string => typeof v === "string",
        );
        onSelect(stringValues);
      }}
      config={config}
    />
  );
}

// Task Multi Picker
function TaskMultiPicker({
  report,
  value,
  onSelect,
  ...props
}: {
  report: GeneratedReportSource;
  value: string[];
  onSelect: (value: string[]) => void;
} & Omit<
  React.ComponentProps<typeof AbstractMultiPicker<string, ReportEntity>>,
  "value" | "onSelect" | "config"
>) {
  const config = {
    renderItem: (item: Unassigned | ReportEntity) =>
      unassignedUtils.mapOrElse(
        item,
        (entity) => <div className="px-1">{entity.name}</div>,
        <div>Unassigned</div>,
      ),
    renderOption: (item: ReportEntity) => (
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        {item.description && (
          <span className="text-sm text-slate-500">{item.description}</span>
        )}
      </div>
    ),
    getItemId: (item: ReportEntity) => item.id,
    getKey: (item: ReportEntity) => item.id,
    useSelectedItems: (ids: Array<Unassigned | string>) => {
      const stringIds = ids.filter(
        (id): id is string => typeof id === "string",
      );
      const entities = stringIds.map((id) => ({
        id,
        name: report.data.definitions.taskTypes[id]?.name || id,
        description: report.data.definitions.taskTypes[id]?.description,
      }));
      return rd.of(entities);
    },
    useItems: (query: string) => {
      const entities = Object.entries(report.data.definitions.taskTypes)
        .map(([id, taskType]) => ({
          id,
          name: taskType.name,
          description: taskType.description,
        }))
        .filter(
          (entity) =>
            entity.name.toLowerCase().includes(query.toLowerCase()) ||
            entity.description?.toLowerCase().includes(query.toLowerCase()),
        );
      return rd.of(entities);
    },
    searchPlaceholder: "Search tasks...",
    placeholder: "Select tasks",
  };

  return (
    <AbstractMultiPicker
      {...props}
      value={value}
      onSelect={(newValue) => {
        const stringValues = newValue.filter(
          (v): v is string => typeof v === "string",
        );
        onSelect(stringValues);
      }}
      config={config}
    />
  );
}

// Activity Multi Picker
function ActivityMultiPicker({
  report,
  value,
  onSelect,
  ...props
}: {
  report: GeneratedReportSource;
  value: string[];
  onSelect: (value: string[]) => void;
} & Omit<
  React.ComponentProps<typeof AbstractMultiPicker<string, ReportEntity>>,
  "value" | "onSelect" | "config"
>) {
  const config = {
    renderItem: (item: Unassigned | ReportEntity) =>
      unassignedUtils.mapOrElse(
        item,
        (entity) => <div className="px-1">{entity.name}</div>,
        <div>Unassigned</div>,
      ),
    renderOption: (item: ReportEntity) => (
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        {item.description && (
          <span className="text-sm text-slate-500">{item.description}</span>
        )}
      </div>
    ),
    getItemId: (item: ReportEntity) => item.id,
    getKey: (item: ReportEntity) => item.id,
    useSelectedItems: (ids: Array<Unassigned | string>) => {
      const stringIds = ids.filter(
        (id): id is string => typeof id === "string",
      );
      const entities = stringIds.map((id) => ({
        id,
        name: report.data.definitions.activityTypes[id]?.name || id,
        description: report.data.definitions.activityTypes[id]?.description,
      }));
      return rd.of(entities);
    },
    useItems: (query: string) => {
      const entities = Object.entries(report.data.definitions.activityTypes)
        .map(([id, activityType]) => ({
          id,
          name: activityType.name,
          description: activityType.description,
        }))
        .filter(
          (entity) =>
            entity.name.toLowerCase().includes(query.toLowerCase()) ||
            entity.description?.toLowerCase().includes(query.toLowerCase()),
        );
      return rd.of(entities);
    },
    searchPlaceholder: "Search activities...",
    placeholder: "Select activities",
  };

  return (
    <AbstractMultiPicker
      {...props}
      value={value}
      onSelect={(newValue) => {
        const stringValues = newValue.filter(
          (v): v is string => typeof v === "string",
        );
        onSelect(stringValues);
      }}
      config={config}
    />
  );
}

function ProjectMultiPicker({
  report,
  value,
  onSelect,
  ...props
}: {
  report: GeneratedReportSource;
  value: string[];
  onSelect: (value: string[]) => void;
} & Omit<
  React.ComponentProps<typeof AbstractMultiPicker<string, ReportEntity>>,
  "value" | "onSelect" | "config"
>) {
  const config = {
    renderItem: (item: Unassigned | ReportEntity) =>
      unassignedUtils.mapOrElse(
        item,
        (entity) => <div className="px-1">{entity.name}</div>,
        <div>Unassigned</div>,
      ),
    renderOption: (item: ReportEntity) => (
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        {item.description && (
          <span className="text-sm text-slate-500">{item.description}</span>
        )}
      </div>
    ),
    getItemId: (item: ReportEntity) => item.id,
    getKey: (item: ReportEntity) => item.id,
    useSelectedItems: (ids: Array<Unassigned | string>) => {
      const stringIds = ids.filter(
        (id): id is string => typeof id === "string",
      );
      const entities = stringIds.map((id) => ({
        id,
        name: report.data.definitions.projectTypes[id]?.name || id,
        description: report.data.definitions.projectTypes[id]?.description,
      }));
      return rd.of(entities);
    },
    useItems: (query: string) => {
      const entities = Object.entries(report.data.definitions.projectTypes)
        .map(([id, projectType]) => ({
          id,
          name: projectType.name,
          description: projectType.description,
        }))
        .filter(
          (entity) =>
            entity.name.toLowerCase().includes(query.toLowerCase()) ||
            entity.description?.toLowerCase().includes(query.toLowerCase()),
        );
      return rd.of(entities);
    },
    searchPlaceholder: "Search projects...",
    placeholder: "Select projects...",
  };

  return (
    <AbstractMultiPicker
      {...props}
      value={value}
      onSelect={(value, _selectedItem, _action) => {
        const stringValues = value.filter(
          (id): id is string => typeof id === "string",
        );
        onSelect(stringValues);
      }}
      config={config}
    />
  );
}

interface GroupedViewWidgetProps extends WithFrontServices {
  report: GeneratedReportSource;
}

interface TimeEntriesForGroupProps extends WithFrontServices {
  groupPath: string[];
  report: GeneratedReportSource;
  filters: EntryFilters;
  groupBy: GroupSpecifier[];
}

// Separate component to handle time entries rendering with consistent hooks
function TimeEntriesForGroup({
  groupPath,
  report,
  services,
  filters,
  groupBy,
}: TimeEntriesForGroupProps) {
  // Always call hooks at the top level
  const query = generatedReportSourceQueryUtils.ofDefault();

  // Get time entries for the group
  const getTimeEntriesForGroup = (): typeof report.data.timeEntries => {
    let filteredEntries = report.data.timeEntries;

    // Apply filters first
    if (filters.roleIds && filters.roleIds.length > 0) {
      filteredEntries = filteredEntries.filter((entry) =>
        filters.roleIds!.includes(entry.roleId),
      );
    }
    if (filters.contractorIds && filters.contractorIds.length > 0) {
      filteredEntries = filteredEntries.filter((entry) =>
        filters.contractorIds!.includes(entry.contractorId),
      );
    }
    if (filters.taskIds && filters.taskIds.length > 0) {
      filteredEntries = filteredEntries.filter((entry) =>
        filters.taskIds!.includes(entry.taskId),
      );
    }
    if (filters.activityIds && filters.activityIds.length > 0) {
      filteredEntries = filteredEntries.filter((entry) =>
        filters.activityIds!.includes(entry.activityId),
      );
    }

    // Apply grouping filters based on the group path
    for (let i = 0; i < groupPath.length && i < groupBy.length; i++) {
      const groupKey = groupPath[i];
      const specifier = groupBy[i];

      filteredEntries = filteredEntries.filter((entry) => {
        switch (specifier.type) {
          case "contractor":
            return entry.contractorId.toString() === groupKey;
          case "role":
            return entry.roleId === groupKey;
          case "task":
            return entry.taskId === groupKey;
          case "activity":
            return entry.activityId === groupKey;
          default:
            return true;
        }
      });
    }

    return filteredEntries;
  };

  const timeEntries = getTimeEntriesForGroup();
  const timeEntriesData = rd.of(timeEntries);

  // Always render ListView to maintain consistent hooks
  if (timeEntries.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm">
        No time entries found for this group.
      </div>
    );
  }

  return (
    <ListView
      data={timeEntriesData}
      query={query}
      onQueryChange={() => {}}
      columns={[
        timeEntryColumns.id,
        timeEntryColumns.task(report.data),
        timeEntryColumns.activity(report.data),
        timeEntryColumns.role(report.data),
        timeEntryColumns.contractor(services),
        timeEntryColumns.startTime(services),
        timeEntryColumns.endTime(services),
        timeEntryColumns.duration,
        timeEntryColumns.costRate(report.data, services),
        timeEntryColumns.billingRate(report.data, services),
        timeEntryColumns.costAmount(report.data, services),
        timeEntryColumns.billingAmount(report.data, services),
        timeEntryColumns.profitAmount(report.data, services),
        timeEntryColumns.note,
      ]}
    />
  );
}

interface GroupedViewConfig {
  filters: EntryFilters;
  groupBy: GroupSpecifier[];
}

export function GroupedViewWidget(props: GroupedViewWidgetProps) {
  const [config, setConfig] = useState<GroupedViewConfig>({
    filters: {},
    groupBy: [{ type: "project" }, { type: "activity" }],
  });

  const [showFilters, setShowFilters] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch contractor data for name lookup
  const contractorIds = Array.from(
    new Set(props.report.data.timeEntries.map((entry) => entry.contractorId)),
  );
  const contractorsQuery = props.services.contractorService.useContractors(
    contractorQueryUtils
      .getBuilder()
      .build((q) => [
        q.withFilter("id", { operator: "oneOf", value: contractorIds }),
      ]),
  );

  // Create contractor lookup function
  const contractorNameLookup = (contractorId: number) => {
    return (
      rd.tryMap(
        contractorsQuery,
        (contractors) =>
          contractors.find((c) => c.id === contractorId)?.fullName,
      ) || undefined
    );
  };

  // Get the grouped view data
  const groupedView: GroupedView =
    props.services.generatedReportViewService.getGroupedView(
      props.report,
      config.filters,
      config.groupBy,
      contractorNameLookup,
    );

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const updateFilters = (newFilters: Partial<EntryFilters>) => {
    setConfig((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  };

  const updateGroupBy = (index: number, newType: GroupSpecifier["type"]) => {
    setConfig((prev) => ({
      ...prev,
      groupBy: prev.groupBy.map((spec, i) =>
        i === index ? { type: newType } : spec,
      ),
    }));
  };

  const addGroupBy = () => {
    setConfig((prev) => ({
      ...prev,
      groupBy: [...prev.groupBy, { type: "role" }],
    }));
  };

  const removeGroupBy = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      groupBy: prev.groupBy.filter((_, i) => i !== index),
    }));
  };

  const moveGroupBy = (fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const newGroupBy = [...prev.groupBy];
      const [movedItem] = newGroupBy.splice(fromIndex, 1);
      newGroupBy.splice(toIndex, 0, movedItem);
      return {
        ...prev,
        groupBy: newGroupBy,
      };
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveGroupBy(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const renderGroupSummary = (
    group: GroupedEntrySummary,
    level: number = 0,
    groupPath: string[] = [],
  ) => {
    const isExpanded = expandedGroups.has(group.groupKey);
    const hasSubGroups = group.subGroups && group.subGroups.length > 0;
    const indent = level * 20;
    const currentGroupPath = [...groupPath, group.groupKey];

    return (
      <div key={group.groupKey} className="border rounded-lg">
        <div
          className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${
            level > 0 ? "border-l-4 border-slate-200" : ""
          } ${!hasSubGroups ? "border-l-4 border-blue-200" : ""}`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => toggleGroupExpansion(group.groupKey)}
          title={
            !hasSubGroups
              ? "Click to view time entries"
              : "Click to expand/collapse"
          }
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{group.groupName}</h4>
                {group.groupDescription && (
                  <span className="text-sm text-slate-600">
                    {group.groupDescription}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                <span>{group.entriesCount} entries</span>
                <span>{group.totalHours.toFixed(1)}h</span>
                <div className="flex items-center gap-1">
                  <CurrencyValueWidget
                    values={group.costBudget}
                    services={props.services}
                    exchangeService={props.services.exchangeService}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <CurrencyValueWidget
                values={group.earningsBudget}
                services={props.services}
                exchangeService={props.services.exchangeService}
                className="text-xs"
              />
            </Badge>
          </div>
        </div>

        {hasSubGroups && isExpanded && (
          <div className="border-t bg-slate-50/50">
            {group.subGroups?.map((subGroup) =>
              renderGroupSummary(subGroup, level + 1, currentGroupPath),
            )}
          </div>
        )}

        {/* Show time entries when we reach the deepest level and group is expanded */}
        {!hasSubGroups && isExpanded && (
          <div className="border-t bg-white">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-slate-700">
                  Time Entries
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {group.entriesCount} entries
                </Badge>
              </div>
              <TimeEntriesForGroup
                groupPath={currentGroupPath}
                report={props.report}
                services={props.services}
                filters={config.filters}
                groupBy={config.groupBy}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Grouped View Configuration
          </CardTitle>
          <CardDescription>
            Configure filters and grouping to create custom report views
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-slate-50">
                {/* Contractor Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contractors</label>
                  <ContractorMultiPicker
                    size="sm"
                    services={props.services}
                    value={config.filters.contractorIds || []}
                    onSelect={(value) => {
                      const numberValues = value.filter(
                        (v): v is number => typeof v === "number",
                      );
                      updateFilters({
                        contractorIds:
                          numberValues.length > 0 ? numberValues : undefined,
                      });
                    }}
                  />
                </div>

                {/* Role Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Roles</label>
                  <RoleMultiPicker
                    size="sm"
                    report={props.report}
                    value={config.filters.roleIds || []}
                    onSelect={(value) =>
                      updateFilters({
                        roleIds: value.length > 0 ? value : undefined,
                      })
                    }
                  />
                </div>

                {/* Task Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tasks</label>
                  <TaskMultiPicker
                    size="sm"
                    report={props.report}
                    value={config.filters.taskIds || []}
                    onSelect={(value) =>
                      updateFilters({
                        taskIds: value.length > 0 ? value : undefined,
                      })
                    }
                  />
                </div>

                {/* Activity Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Activities</label>
                  <ActivityMultiPicker
                    size="sm"
                    report={props.report}
                    value={config.filters.activityIds || []}
                    onSelect={(value) =>
                      updateFilters({
                        activityIds: value.length > 0 ? value : undefined,
                      })
                    }
                  />
                </div>

                {/* Project Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Projects</label>
                  <ProjectMultiPicker
                    size="sm"
                    report={props.report}
                    value={config.filters.projectIds || []}
                    onSelect={(value) =>
                      updateFilters({
                        projectIds: value.length > 0 ? value : undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Grouping Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Grouping</h3>
            <div className="space-y-3">
              {config.groupBy.map((spec, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    draggedIndex === index
                      ? "opacity-50 bg-blue-50 border-blue-200"
                      : "bg-white hover:bg-slate-50"
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <Select
                    value={spec.type}
                    onValueChange={(value: GroupSpecifier["type"]) =>
                      updateGroupBy(index, value)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  {config.groupBy.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeGroupBy(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {config.groupBy.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addGroupBy}
                  className="ml-11"
                >
                  Add Grouping Level
                </Button>
              )}
              {config.groupBy.length > 1 && (
                <p className="text-sm text-slate-600 ml-11">
                  💡 Drag and drop to reorder grouping levels
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Results Summary</CardTitle>
          <CardDescription>
            Total entries: {groupedView.totalEntries} • Total hours:{" "}
            {groupedView.totalHours.toFixed(1)}h
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-slate-600 mb-1">Total Cost</div>
              <div className="font-semibold">
                <CurrencyValueWidget
                  values={groupedView.totalCostBudget}
                  services={props.services}
                  exchangeService={props.services.exchangeService}
                />
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-slate-600 mb-1">Total Billing</div>
              <div className="font-semibold">
                <CurrencyValueWidget
                  values={groupedView.totalBillingBudget}
                  services={props.services}
                  exchangeService={props.services.exchangeService}
                />
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-slate-600 mb-1">Total Earnings</div>
              <div className="font-semibold text-green-600">
                <CurrencyValueWidget
                  values={groupedView.totalEarningsBudget}
                  services={props.services}
                  exchangeService={props.services.exchangeService}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Results */}
      <Card>
        <CardHeader>
          <CardTitle>Grouped Results</CardTitle>
          <CardDescription>
            Click on groups to expand/collapse sub-groups. Time entries are
            shown at the deepest level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {groupedView.groups.map((group) =>
              renderGroupSummary(group, 0, []),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
