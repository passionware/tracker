import { GeneratedReportSourceApi } from "./generated-report-source.api";

export function createGeneratedReportSourceMock(): GeneratedReportSourceApi {
  const mockData: Array<{
    id: number;
    createdAt: Date;
    projectIterationId: number;
    data: {
      definitions: {
        taskTypes: { [key: string]: any };
        activityTypes: { [key: string]: any };
        projectTypes: { [key: string]: any };
        roleTypes: { [key: string]: any };
      };
      timeEntries: Array<{
        id: string;
        note: string;
        taskId: string;
        activityId: string;
        projectId: string;
        contractorId: number;
        roleId: string;
        createdAt: Date;
        updatedAt: Date;
        startAt: Date;
        endAt: Date;
      }>;
    };
    originalData: unknown;
  }> = [
    {
      id: 1,
      createdAt: new Date("2024-01-15T10:30:00Z"),
      projectIterationId: 1,
      data: {
        definitions: {
          taskTypes: {
            development: {
              name: "Development",
              description: "Software development tasks",
              parameters: { complexity: "medium" },
            },
            testing: {
              name: "Testing",
              description: "Quality assurance and testing",
              parameters: { coverage: "high" },
            },
          },
          activityTypes: {
            coding: {
              name: "Coding",
              description: "Writing code and implementation",
            },
            review: {
              name: "Code Review",
              description: "Reviewing code changes",
            },
          },
          projectTypes: {
            webapp: {
              name: "Web Application",
              description: "Main web application project",
              parameters: { type: "frontend" },
            },
            mobile: {
              name: "Mobile App",
              description: "Mobile application development",
              parameters: { platform: "cross-platform" },
            },
          },
          roleTypes: {
            developer: {
              name: "Developer",
              description: "Software developer role",
              rates: [
                {
                  billing: "hourly",
                  activityType: "coding",
                  taskType: "development",
                  costRate: 50,
                  costCurrency: "USD",
                  billingRate: 75,
                  billingCurrency: "USD",
                },
              ],
            },
          },
        },
        timeEntries: [
          {
            id: "entry-1",
            note: "Implemented user authentication",
            taskId: "development",
            activityId: "coding",
            projectId: "webapp",
            roleId: "developer",
            contractorId: 1,
            createdAt: new Date("2024-01-15T08:00:00Z"),
            updatedAt: new Date("2024-01-15T08:00:00Z"),
            startAt: new Date("2024-01-15T08:00:00Z"),
            endAt: new Date("2024-01-15T16:00:00Z"),
          },
          {
            id: "entry-2",
            note: "Code review for auth module",
            taskId: "testing",
            activityId: "review",
            projectId: "webapp",
            roleId: "developer",
            contractorId: 1,
            createdAt: new Date("2024-01-15T16:30:00Z"),
            updatedAt: new Date("2024-01-15T16:30:00Z"),
            startAt: new Date("2024-01-15T16:30:00Z"),
            endAt: new Date("2024-01-15T18:30:00Z"),
          },
        ],
      },
      originalData: {
        sourceType: "tmetric",
        rawReports: [
          { id: 1, hours: 8, description: "Development work" },
          { id: 2, hours: 2, description: "Code review" },
        ],
        metadata: {
          generatedAt: "2024-01-15T10:30:00Z",
          sourceVersion: "1.0",
        },
      },
    },
    {
      id: 2,
      createdAt: new Date("2024-01-20T14:45:00Z"),
      projectIterationId: 2,
      data: {
        definitions: {
          taskTypes: {
            frontend: {
              name: "Frontend Development",
              description: "User interface development",
              parameters: { framework: "React" },
            },
            backend: {
              name: "Backend Development",
              description: "Server-side development",
              parameters: { language: "TypeScript" },
            },
          },
          activityTypes: {
            implementation: {
              name: "Implementation",
              description: "Feature implementation",
            },
            debugging: {
              name: "Debugging",
              description: "Bug fixing and debugging",
            },
          },
          projectTypes: {
            dashboard: {
              name: "Dashboard Project",
              description: "Main dashboard development",
              parameters: { priority: "high" },
            },
          },
          roleTypes: {
            "senior-dev": {
              name: "Senior Developer",
              description: "Senior software developer",
              rates: [
                {
                  billing: "hourly",
                  activityType: "implementation",
                  taskType: "frontend",
                  costRate: 70,
                  costCurrency: "USD",
                  billingRate: 95,
                  billingCurrency: "USD",
                },
              ],
            },
          },
        },
        timeEntries: [
          {
            id: "entry-3",
            note: "Built dashboard components",
            taskId: "frontend",
            activityId: "implementation",
            projectId: "dashboard",
            roleId: "senior-dev",
            contractorId: 2,
            createdAt: new Date("2024-01-20T09:00:00Z"),
            updatedAt: new Date("2024-01-20T09:00:00Z"),
            startAt: new Date("2024-01-20T09:00:00Z"),
            endAt: new Date("2024-01-20T17:00:00Z"),
          },
          {
            id: "entry-4",
            note: "Fixed API integration bugs",
            taskId: "backend",
            activityId: "debugging",
            projectId: "dashboard",
            roleId: "senior-dev",
            contractorId: 2,
            createdAt: new Date("2024-01-20T17:30:00Z"),
            updatedAt: new Date("2024-01-20T17:30:00Z"),
            startAt: new Date("2024-01-20T17:30:00Z"),
            endAt: new Date("2024-01-20T19:30:00Z"),
          },
        ],
      },
      originalData: {
        sourceType: "tmetric",
        rawReports: [
          { id: 3, hours: 8, description: "Frontend development" },
          { id: 4, hours: 2, description: "Backend debugging" },
        ],
        metadata: {
          generatedAt: "2024-01-20T14:45:00Z",
          sourceVersion: "1.1",
        },
      },
    },
    {
      id: 3,
      createdAt: new Date("2024-02-01T09:15:00Z"),
      projectIterationId: 1,
      data: {
        definitions: {
          taskTypes: {
            maintenance: {
              name: "Maintenance",
              description: "Code maintenance and updates",
              parameters: { priority: "medium" },
            },
          },
          activityTypes: {
            refactoring: {
              name: "Refactoring",
              description: "Code refactoring and optimization",
            },
          },
          projectTypes: {
            maintenance: {
              name: "Maintenance Project",
              description: "Code maintenance and refactoring",
              parameters: { type: "ongoing" },
            },
          },
          roleTypes: {
            maintainer: {
              name: "Code Maintainer",
              description: "Code maintenance specialist",
              rates: [
                {
                  billing: "hourly",
                  activityType: "refactoring",
                  taskType: "maintenance",
                  costRate: 45,
                  costCurrency: "USD",
                  billingRate: 65,
                  billingCurrency: "USD",
                },
              ],
            },
          },
        },
        timeEntries: [
          {
            id: "entry-5",
            note: "Refactored authentication service",
            taskId: "maintenance",
            activityId: "refactoring",
            projectId: "maintenance",
            roleId: "maintainer",
            contractorId: 3,
            createdAt: new Date("2024-02-01T08:00:00Z"),
            updatedAt: new Date("2024-02-01T08:00:00Z"),
            startAt: new Date("2024-02-01T08:00:00Z"),
            endAt: new Date("2024-02-01T12:00:00Z"),
          },
        ],
      },
      originalData: {
        sourceType: "tmetric",
        rawReports: [{ id: 6, hours: 4, description: "Code refactoring" }],
        metadata: {
          generatedAt: "2024-02-01T09:15:00Z",
          sourceVersion: "1.2",
        },
      },
    },
  ];

  return {
    getGeneratedReportSources: async (query) => {
      // Simple mock filtering
      let filteredData = [...mockData];

      if (query.filters.projectIterationId) {
        const filter = query.filters.projectIterationId;
        filteredData = filteredData.filter((item) => {
          switch (filter.operator) {
            case "oneOf":
              return filter.value.includes(item.projectIterationId);
            case "matchNone":
              return !filter.value.includes(item.projectIterationId);
            default:
              return true;
          }
        });
      }

      if (query.filters.createdAt) {
        const filter = query.filters.createdAt;
        filteredData = filteredData.filter((item) => {
          const itemDate = item.createdAt;
          switch (filter.operator) {
            case "equal":
              return itemDate.getTime() === filter.value.getTime();
            case "greaterThan":
              return itemDate > filter.value;
            case "lessThan":
              return itemDate < filter.value;
            case "between":
              return (
                itemDate >= filter.value.from && itemDate <= filter.value.to
              );
            default:
              return true;
          }
        });
      }

      // Simple search mock
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filteredData = filteredData.filter((item) => {
          // Search in time entry notes
          const timeEntryMatches = item.data.timeEntries.some((entry) =>
            entry.note.toLowerCase().includes(searchLower),
          );

          // Search in task type names and descriptions
          const taskTypeMatches = Object.values(
            item.data.definitions.taskTypes,
          ).some(
            (taskType) =>
              taskType.name.toLowerCase().includes(searchLower) ||
              taskType.description.toLowerCase().includes(searchLower),
          );

          // Search in activity type names and descriptions
          const activityTypeMatches = Object.values(
            item.data.definitions.activityTypes,
          ).some(
            (activityType) =>
              activityType.name.toLowerCase().includes(searchLower) ||
              activityType.description.toLowerCase().includes(searchLower),
          );

          // Search in role type names and descriptions
          const roleTypeMatches = Object.values(
            item.data.definitions.roleTypes,
          ).some(
            (roleType) =>
              roleType.name.toLowerCase().includes(searchLower) ||
              roleType.description.toLowerCase().includes(searchLower),
          );

          return (
            timeEntryMatches ||
            taskTypeMatches ||
            activityTypeMatches ||
            roleTypeMatches
          );
        });
      }

      // Simple sorting mock
      if (query.sort) {
        filteredData.sort((a, b) => {
          const { field, order } = query.sort!;
          let aValue: any, bValue: any;

          switch (field) {
            case "createdAt":
              aValue = a.createdAt.getTime();
              bValue = b.createdAt.getTime();
              break;
            case "projectIterationId":
              aValue = a.projectIterationId;
              bValue = b.projectIterationId;
              break;
            default:
              return 0;
          }

          if (order === "asc") {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        });
      }

      return filteredData;
    },

    getGeneratedReportSource: async (id) => {
      const item = mockData.find((item) => item.id === id);
      if (!item) {
        throw new Error(`GeneratedReportSource with id ${id} not found`);
      }
      return item;
    },

    createGeneratedReportSource: async (payload) => {
      const newId = Math.max(...mockData.map((item) => item.id)) + 1;
      const newItem = {
        id: newId,
        createdAt: new Date(),
        projectIterationId: payload.projectIterationId,
        data: payload.data,
        originalData: payload.originalData,
      };
      mockData.push(newItem);
      return newItem;
    },

    updateGeneratedReportSource: async (id, payload) => {
      const itemIndex = mockData.findIndex((item) => item.id === id);
      if (itemIndex === -1) {
        throw new Error(`GeneratedReportSource with id ${id} not found`);
      }

      const updatedItem = {
        ...mockData[itemIndex],
        ...payload,
      };
      mockData[itemIndex] = updatedItem;
      return updatedItem;
    },

    deleteGeneratedReportSource: async (id) => {
      const itemIndex = mockData.findIndex((item) => item.id === id);
      if (itemIndex === -1) {
        throw new Error(`GeneratedReportSource with id ${id} not found`);
      }
      mockData.splice(itemIndex, 1);
    },
  };
}
