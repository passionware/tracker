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
import { Separator } from "@/components/ui/separator.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { CostToBillingWidget } from "@/features/_common/CostToBillingWidget.tsx";
import { AbstractMultiPicker } from "@/features/_common/elements/pickers/_common/AbstractMultiPicker.tsx";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  EntryFilters,
  GroupedEntrySummary,
  GroupedView,
  GroupSpecifier,
} from "@/services/front/GeneratedReportViewService/GeneratedReportViewService.ts";
import { rd } from "@passionware/monads";
import { ChevronDown, ChevronRight, Filter, Settings } from "lucide-react";
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
    if (filters.projectIds && filters.projectIds.length > 0) {
      filteredEntries = filteredEntries.filter((entry) =>
        filters.projectIds!.includes(entry.projectId),
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
          case "project":
            return entry.projectId === groupKey;
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
  groupBy: GroupSpecifier;
}

// DrillDownContext removed - no longer needed with tab-based expansion

interface GroupSummaryItemProps extends WithFrontServices {
  group: GroupedEntrySummary;
  level: number;
  groupPath: string[];
  currentGroupBy: GroupSpecifier["type"];
  appliedGroupTypes: GroupSpecifier["type"][]; // Track which grouping types have been applied
  report: GeneratedReportSource;
  groupFilters: EntryFilters;
  contractorNameLookup?: (contractorId: number) => string | undefined;
  onDrillDown: (
    groupKey: string,
    groupName: string,
    groupType: GroupSpecifier["type"],
    drillDownType: GroupSpecifier["type"],
  ) => void;
  onShowRawData: (
    groupKey: string,
    groupName: string,
    groupType: GroupSpecifier["type"],
  ) => void;
}

function GroupSummaryItem(props: GroupSummaryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<
    GroupSpecifier["type"] | "raw" | null
  >(null);
  const [subGroups, setSubGroups] = useState<GroupedEntrySummary[]>([]);

  const {
    group,
    level,
    groupPath,
    currentGroupBy,
    appliedGroupTypes,
    services,
    report,
    groupFilters,
    contractorNameLookup,
    onDrillDown,
    onShowRawData,
  } = props;

  const indent = level * 20;
  const currentGroupPath = [...groupPath, group.groupKey];

  const toggleExpansion = () => {
    if (!isExpanded) {
      // First click - just expand (no default tab)
      setIsExpanded(true);
      setActiveTab(null);
      setSubGroups([]);
    } else {
      // Click again - collapse
      setIsExpanded(false);
      setActiveTab(null);
      setSubGroups([]);
    }
  };

  const handleTabClick = async (tabType: GroupSpecifier["type"] | "raw") => {
    if (activeTab === tabType) {
      // Same tab clicked - toggle off
      setIsExpanded(false);
      setActiveTab(null);
      setSubGroups([]);
      return;
    }

    if (tabType === "raw") {
      // Show raw data
      setActiveTab("raw");
      setIsExpanded(true);
      setSubGroups([]);
      return;
    }

    // Create filters for this specific group
    const groupFilters = { ...props.groupFilters };
    switch (currentGroupBy) {
      case "contractor":
        groupFilters.contractorIds = [Number(group.groupKey)];
        break;
      case "role":
        groupFilters.roleIds = [group.groupKey];
        break;
      case "task":
        groupFilters.taskIds = [group.groupKey];
        break;
      case "activity":
        groupFilters.activityIds = [group.groupKey];
        break;
      case "project":
        groupFilters.projectIds = [group.groupKey];
        break;
    }

    // Get the drill-down view for this specific group
    const drillDownView =
      props.services.generatedReportViewService.getGroupedView(
        props.report,
        groupFilters,
        { type: tabType },
        props.contractorNameLookup,
      );

    setSubGroups(drillDownView.groups);
    setActiveTab(tabType);
    setIsExpanded(true);
  };

  return (
    <div key={group.groupKey} className="border rounded-lg">
      <div
        className="p-3 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 border-blue-200"
        style={{ paddingLeft: `${12 + indent}px` }}
        onClick={toggleExpansion}
        title="Click to view time entries"
      >
        {/* Main content row */}
        <div className="flex items-center justify-between">
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
                {activeTab && activeTab !== "raw" && (
                  <Badge variant="secondary" className="text-xs">
                    {currentGroupBy} → {activeTab}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                <span>{group.entriesCount} entries</span>
                <span>{group.totalHours.toFixed(1)}h</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CostToBillingWidget
              cost={group.costBudget}
              billing={group.billingBudget}
              services={services}
              size="sm"
            />
          </div>
        </div>

        {/* Tab buttons row - left aligned */}
        <div className="flex items-center gap-1 mt-2 ml-6">
          {/* Raw Data button - always first */}
          <SimpleTooltip title="View raw time entries">
            <Button
              variant={activeTab === "raw" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleTabClick("raw");
              }}
            >
              📊
            </Button>
          </SimpleTooltip>

          {/* Filter out grouping options that are already applied in the group hierarchy */}
          {currentGroupBy !== "contractor" &&
            !appliedGroupTypes.includes("contractor") && (
              <SimpleTooltip title="Group by contractor">
                <Button
                  variant={activeTab === "contractor" ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClick("contractor");
                  }}
                >
                  👥
                </Button>
              </SimpleTooltip>
            )}
          {currentGroupBy !== "role" && !appliedGroupTypes.includes("role") && (
            <SimpleTooltip title="Group by role">
              <Button
                variant={activeTab === "role" ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabClick("role");
                }}
              >
                🎭
              </Button>
            </SimpleTooltip>
          )}
          {currentGroupBy !== "task" && !appliedGroupTypes.includes("task") && (
            <SimpleTooltip title="Group by task">
              <Button
                variant={activeTab === "task" ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabClick("task");
                }}
              >
                📋
              </Button>
            </SimpleTooltip>
          )}
          {currentGroupBy !== "activity" &&
            !appliedGroupTypes.includes("activity") && (
              <SimpleTooltip title="Group by activity">
                <Button
                  variant={activeTab === "activity" ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClick("activity");
                  }}
                >
                  🎯
                </Button>
              </SimpleTooltip>
            )}
          {currentGroupBy !== "project" &&
            !appliedGroupTypes.includes("project") && (
              <SimpleTooltip title="Group by project">
                <Button
                  variant={activeTab === "project" ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClick("project");
                  }}
                >
                  📁
                </Button>
              </SimpleTooltip>
            )}
        </div>
      </div>

      {/* Show sub-groups or time entries when group is expanded */}
      {isExpanded && (
        <div className="border-t bg-white">
          <div className="p-4">
            {activeTab === "raw" ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-600">
                    Time Entries
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {group.entriesCount} entries
                  </Badge>
                </div>
                <TimeEntriesForGroup
                  groupPath={currentGroupPath}
                  report={report}
                  services={services}
                  filters={groupFilters}
                  groupBy={[{ type: currentGroupBy }]}
                />
              </div>
            ) : activeTab &&
              (activeTab === "contractor" ||
                activeTab === "role" ||
                activeTab === "task" ||
                activeTab === "activity" ||
                activeTab === "project") ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-600">
                    {activeTab === "contractor"
                      ? "👥 Contractors"
                      : activeTab === "role"
                        ? "🎭 Roles"
                        : activeTab === "task"
                          ? "📋 Tasks"
                          : activeTab === "activity"
                            ? "🎯 Activities"
                            : activeTab === "project"
                              ? "📁 Projects"
                              : "Sub-groups"}{" "}
                    in {group.groupName}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {subGroups.length} groups
                  </Badge>
                </div>
                <div className="space-y-2">
                  {subGroups.map((subGroup) => (
                    <GroupSummaryItem
                      key={subGroup.groupKey}
                      group={subGroup}
                      level={level + 1}
                      groupPath={currentGroupPath}
                      currentGroupBy={activeTab}
                      appliedGroupTypes={[...appliedGroupTypes, activeTab]}
                      services={services}
                      report={report}
                      groupFilters={groupFilters}
                      contractorNameLookup={contractorNameLookup}
                      onDrillDown={onDrillDown}
                      onShowRawData={onShowRawData}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">
                Click a tab above to view data
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function GroupedViewWidget(props: GroupedViewWidgetProps) {
  const [config, setConfig] = useState<GroupedViewConfig>({
    filters: {},
    groupBy: { type: "project" },
  });

  const [showFilters, setShowFilters] = useState(false);

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

  // toggleGroupExpansion removed - now handled by individual GroupSummaryItem components

  const updateFilters = (newFilters: Partial<EntryFilters>) => {
    setConfig((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  };

  const updateGroupBy = (newGroupBy: GroupSpecifier) => {
    setConfig((prev) => ({
      ...prev,
      groupBy: newGroupBy,
    }));
  };

  // updateGroupBy removed - now using zoom-in dropdowns for drill-down

  // addGroupBy removed - now using single-level grouping only

  // removeGroupBy removed - now using single-level grouping only

  // moveGroupBy removed - now using single-level grouping only

  // Drill-down functions removed - individual components handle their own state

  // renderGroupSummary removed - now using GroupSummaryItem component

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
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Results Summary</CardTitle>
              <CardDescription>
                Total entries: {groupedView.totalEntries} • Total hours:{" "}
                {groupedView.totalHours.toFixed(1)}h
              </CardDescription>
            </div>
            {/* Root level grouping selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Group by:</span>
              <div className="flex items-center gap-1">
                <SimpleTooltip title="Group by contractor">
                  <Button
                    variant={
                      config.groupBy.type === "contractor"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateGroupBy({ type: "contractor" })}
                  >
                    👥
                  </Button>
                </SimpleTooltip>
                <SimpleTooltip title="Group by role">
                  <Button
                    variant={
                      config.groupBy.type === "role" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateGroupBy({ type: "role" })}
                  >
                    🎭
                  </Button>
                </SimpleTooltip>
                <SimpleTooltip title="Group by task">
                  <Button
                    variant={
                      config.groupBy.type === "task" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateGroupBy({ type: "task" })}
                  >
                    📋
                  </Button>
                </SimpleTooltip>
                <SimpleTooltip title="Group by activity">
                  <Button
                    variant={
                      config.groupBy.type === "activity" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateGroupBy({ type: "activity" })}
                  >
                    🎯
                  </Button>
                </SimpleTooltip>
                <SimpleTooltip title="Group by project">
                  <Button
                    variant={
                      config.groupBy.type === "project" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateGroupBy({ type: "project" })}
                  >
                    📁
                  </Button>
                </SimpleTooltip>
              </div>
            </div>
          </div>
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
            {groupedView.groups.map((group) => (
              <GroupSummaryItem
                key={group.groupKey}
                group={group}
                level={0}
                groupPath={[]}
                currentGroupBy={config.groupBy.type}
                appliedGroupTypes={[config.groupBy.type]}
                services={props.services}
                report={props.report}
                groupFilters={config.filters}
                contractorNameLookup={contractorNameLookup}
                onDrillDown={() => {}} // No longer needed
                onShowRawData={() => {}} // No longer needed
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
