/**
 * Time Reporting BI Tool Story
 *
 * Full-featured business intelligence tool for time tracking analysis
 */

import { CubeView } from "./CubeView.tsx";
import type {
  DimensionDescriptor,
  MeasureDescriptor,
} from "./CubeService.types.ts";
import { useCubeState } from "./useCubeState.ts";

interface TimeEntryData {
  entryId: string;
  contractorId: number;
  contractorName: string;
  projectId: string;
  projectName: string;
  taskType: string;
  activityType: string;
  roleType: string;
  date: Date;
  weekday: string;
  month: string;
  hours: number;
  costRate: number;
  billingRate: number;
  costAmount: number;
  billingAmount: number;
  profit: number;
  profitMargin: number;
  note: string;
}

export const TimeReportingDashboard = () => {
  return (() => {
    // Flatten time entries from generated report data
    const timeEntries: TimeEntryData[] = [
      // Entry 1: Developer - Webapp - Development/Coding
      {
        entryId: "entry-1",
        contractorId: 1,
        contractorName: "John Smith",
        projectId: "webapp",
        projectName: "Web Application",
        taskType: "Development",
        activityType: "Coding",
        roleType: "Developer",
        date: new Date("2024-01-15T08:00:00Z"),
        weekday: "Monday",
        month: "January",
        hours: 8,
        costRate: 50,
        billingRate: 75,
        costAmount: 400,
        billingAmount: 600,
        profit: 200,
        profitMargin: 33.33,
        note: "Implemented user authentication",
      },
      // Entry 2: Developer - Webapp - Testing/Review
      {
        entryId: "entry-2",
        contractorId: 1,
        contractorName: "John Smith",
        projectId: "webapp",
        projectName: "Web Application",
        taskType: "Testing",
        activityType: "Code Review",
        roleType: "Developer",
        date: new Date("2024-01-15T16:30:00Z"),
        weekday: "Monday",
        month: "January",
        hours: 2,
        costRate: 50,
        billingRate: 75,
        costAmount: 100,
        billingAmount: 150,
        profit: 50,
        profitMargin: 33.33,
        note: "Code review for auth module",
      },
      // Entry 3: Senior Dev - Dashboard - Frontend/Implementation
      {
        entryId: "entry-3",
        contractorId: 2,
        contractorName: "Sarah Johnson",
        projectId: "dashboard",
        projectName: "Dashboard Project",
        taskType: "Frontend Development",
        activityType: "Implementation",
        roleType: "Senior Developer",
        date: new Date("2024-01-20T09:00:00Z"),
        weekday: "Saturday",
        month: "January",
        hours: 8,
        costRate: 70,
        billingRate: 95,
        costAmount: 560,
        billingAmount: 760,
        profit: 200,
        profitMargin: 26.32,
        note: "Built dashboard components",
      },
      // Entry 4: Senior Dev - Dashboard - Backend/Debugging
      {
        entryId: "entry-4",
        contractorId: 2,
        contractorName: "Sarah Johnson",
        projectId: "dashboard",
        projectName: "Dashboard Project",
        taskType: "Backend Development",
        activityType: "Debugging",
        roleType: "Senior Developer",
        date: new Date("2024-01-20T17:30:00Z"),
        weekday: "Saturday",
        month: "January",
        hours: 2,
        costRate: 70,
        billingRate: 95,
        costAmount: 140,
        billingAmount: 190,
        profit: 50,
        profitMargin: 26.32,
        note: "Fixed API integration bugs",
      },
      // Entry 5: Maintainer - Maintenance - Maintenance/Refactoring
      {
        entryId: "entry-5",
        contractorId: 3,
        contractorName: "Mike Brown",
        projectId: "maintenance",
        projectName: "Maintenance Project",
        taskType: "Maintenance",
        activityType: "Refactoring",
        roleType: "Code Maintainer",
        date: new Date("2024-02-01T08:00:00Z"),
        weekday: "Thursday",
        month: "February",
        hours: 4,
        costRate: 45,
        billingRate: 65,
        costAmount: 180,
        billingAmount: 260,
        profit: 80,
        profitMargin: 30.77,
        note: "Refactored authentication service",
      },
      // Additional entries for richer data
      {
        entryId: "entry-6",
        contractorId: 1,
        contractorName: "John Smith",
        projectId: "webapp",
        projectName: "Web Application",
        taskType: "Development",
        activityType: "Coding",
        roleType: "Developer",
        date: new Date("2024-01-16T09:00:00Z"),
        weekday: "Tuesday",
        month: "January",
        hours: 7.5,
        costRate: 50,
        billingRate: 75,
        costAmount: 375,
        billingAmount: 562.5,
        profit: 187.5,
        profitMargin: 33.33,
        note: "Database schema optimization",
      },
      {
        entryId: "entry-7",
        contractorId: 2,
        contractorName: "Sarah Johnson",
        projectId: "mobile",
        projectName: "Mobile App",
        taskType: "Frontend Development",
        activityType: "Implementation",
        roleType: "Senior Developer",
        date: new Date("2024-01-22T10:00:00Z"),
        weekday: "Monday",
        month: "January",
        hours: 6,
        costRate: 70,
        billingRate: 95,
        costAmount: 420,
        billingAmount: 570,
        profit: 150,
        profitMargin: 26.32,
        note: "Implemented push notifications",
      },
      {
        entryId: "entry-8",
        contractorId: 3,
        contractorName: "Mike Brown",
        projectId: "webapp",
        projectName: "Web Application",
        taskType: "Testing",
        activityType: "Code Review",
        roleType: "Code Maintainer",
        date: new Date("2024-02-02T14:00:00Z"),
        weekday: "Friday",
        month: "February",
        hours: 3,
        costRate: 45,
        billingRate: 65,
        costAmount: 135,
        billingAmount: 195,
        profit: 60,
        profitMargin: 30.77,
        note: "Security audit and review",
      },
      {
        entryId: "entry-9",
        contractorId: 1,
        contractorName: "John Smith",
        projectId: "mobile",
        projectName: "Mobile App",
        taskType: "Development",
        activityType: "Coding",
        roleType: "Developer",
        date: new Date("2024-01-23T09:00:00Z"),
        weekday: "Tuesday",
        month: "January",
        hours: 5,
        costRate: 50,
        billingRate: 75,
        costAmount: 250,
        billingAmount: 375,
        profit: 125,
        profitMargin: 33.33,
        note: "Implemented offline data sync",
      },
      {
        entryId: "entry-10",
        contractorId: 2,
        contractorName: "Sarah Johnson",
        projectId: "dashboard",
        projectName: "Dashboard Project",
        taskType: "Frontend Development",
        activityType: "Implementation",
        roleType: "Senior Developer",
        date: new Date("2024-02-05T10:00:00Z"),
        weekday: "Monday",
        month: "February",
        hours: 7,
        costRate: 70,
        billingRate: 95,
        costAmount: 490,
        billingAmount: 665,
        profit: 175,
        profitMargin: 26.32,
        note: "Created data visualization widgets",
      },
    ];

    // Define dimensions
    const dimensions: DimensionDescriptor<TimeEntryData, unknown>[] = [
      {
        id: "contractor",
        name: "Contractor",
        icon: "👤",
        getValue: (item) => item.contractorName,
        formatValue: (value) => String(value),
      },
      {
        id: "project",
        name: "Project",
        icon: "📁",
        getValue: (item) => item.projectName,
        formatValue: (value) => String(value),
      },
      {
        id: "taskType",
        name: "Task Type",
        icon: "📝",
        getValue: (item) => item.taskType,
        formatValue: (value) => String(value),
      },
      {
        id: "activityType",
        name: "Activity",
        icon: "⚡",
        getValue: (item) => item.activityType,
        formatValue: (value) => String(value),
      },
      {
        id: "roleType",
        name: "Role",
        icon: "🎭",
        getValue: (item) => item.roleType,
        formatValue: (value) => String(value),
      },
      {
        id: "month",
        name: "Month",
        icon: "📅",
        getValue: (item) => item.month,
        formatValue: (value) => String(value),
      },
      {
        id: "weekday",
        name: "Day of Week",
        icon: "📆",
        getValue: (item) => item.weekday,
        formatValue: (value) => String(value),
      },
    ];

    // Define measures
    const measures: MeasureDescriptor<TimeEntryData, unknown>[] = [
      {
        id: "totalHours",
        name: "Total Hours",
        icon: "⏱️",
        getValue: (item) => item.hours,
        aggregate: (values) =>
          values.reduce((sum, v) => (sum as number) + (v as number), 0),
        formatValue: (value) => `${(value as number).toFixed(2)}h`,
      },
      {
        id: "cost",
        name: "Total Cost",
        icon: "💰",
        getValue: (item) => item.costAmount,
        aggregate: (values) =>
          values.reduce((sum, v) => (sum as number) + (v as number), 0),
        formatValue: (value) =>
          `$${(value as number).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        id: "billing",
        name: "Billable Amount",
        icon: "💵",
        getValue: (item) => item.billingAmount,
        aggregate: (values) =>
          values.reduce((sum, v) => (sum as number) + (v as number), 0),
        formatValue: (value) =>
          `$${(value as number).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        id: "profit",
        name: "Profit",
        icon: "📈",
        getValue: (item) => item.profit,
        aggregate: (values) =>
          values.reduce((sum, v) => (sum as number) + (v as number), 0),
        formatValue: (value) =>
          `$${(value as number).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        id: "profitMargin",
        name: "Profit Margin %",
        icon: "📊",
        getValue: (item) => item.profitMargin,
        aggregate: (values) => {
          const sum = values.reduce(
            (sum, v) => (sum as number) + (v as number),
            0,
          ) as number;
          return sum / values.length; // Average profit margin
        },
        formatValue: (value) => `${(value as number).toFixed(2)}%`,
      },
      {
        id: "avgHourlyRate",
        name: "Avg Hourly Rate",
        icon: "💲",
        getValue: (item) => item.billingRate,
        aggregate: (values) => {
          const sum = values.reduce(
            (sum, v) => (sum as number) + (v as number),
            0,
          ) as number;
          return sum / values.length;
        },
        formatValue: (value) => `$${(value as number).toFixed(2)}/h`,
      },
    ];

    const state = useCubeState({
      data: timeEntries,
      dimensions,
      measures,
      initialDefaultDimensionSequence: ["project", "taskType"], // Default hierarchy
      activeMeasures: ["totalHours", "cost", "billing", "profit"],
      includeItems: true,
    });

    return (
      <div className="p-8 max-w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">⏱️ Time Reporting BI Tool</h2>
          <p className="text-sm text-slate-600 mb-4">
            Comprehensive analytics for time tracking, costs, billing, and
            profitability. Explore by contractor, project, task type, activity,
            role, and time period.
          </p>
          <div className="flex gap-2 items-center bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-900">📊 Dataset:</div>
            <div className="text-sm text-blue-700">
              {timeEntries.length} time entries •{" "}
              {new Set(timeEntries.map((e) => e.contractorId)).size} contractors
              • {new Set(timeEntries.map((e) => e.projectId)).size} projects •
              Total:{" "}
              {timeEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)}h
            </div>
          </div>
        </div>

        <CubeView
          state={state}
          showGrandTotals={true}
          enableRawDataView={true}
          enableZoomIn={true}
          enableDimensionPicker={true}
          maxInitialDepth={0}
          renderRawData={(items) => (
            <div className="space-y-2">
              {items.slice(0, 10).map((item) => {
                const entry = item as TimeEntryData;
                return (
                  <div
                    key={entry.entryId}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {entry.note}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            👤 {entry.contractorName}
                          </span>
                          <span className="flex items-center gap-1">
                            📁 {entry.projectName}
                          </span>
                          <span className="flex items-center gap-1">
                            🎭 {entry.roleType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>📝 {entry.taskType}</span>
                          <span>⚡ {entry.activityType}</span>
                          <span>📅 {entry.date.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {entry.hours}h
                        </div>
                        <div className="text-xs text-green-700 font-medium">
                          ${entry.billingAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Profit: ${entry.profit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length > 10 && (
                <div className="text-xs text-center text-slate-500 py-2">
                  +{items.length - 10} more entries
                </div>
              )}
            </div>
          )}
        />
      </div>
    );
  })();
};
