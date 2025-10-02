import { GeneratedReportSourceApi } from "./generated-report-source.api";

export function createGeneratedReportSourceMock(): GeneratedReportSourceApi {
  const mockData: Array<{
    id: number;
    createdAt: Date;
    projectIterationId: number;
    data: Record<string, any>;
    originalData: Record<string, any>;
  }> = [
    {
      id: 1,
      createdAt: new Date("2024-01-15T10:30:00Z"),
      projectIterationId: 1,
      data: {
        reportType: "monthly",
        generatedBy: "system",
        version: "1.0",
        content: {
          summary: "Monthly report for January 2024",
          sections: ["overview", "financials", "timeline"],
        },
      },
      originalData: {
        sourceType: "tmetric",
        rawReports: [
          { id: 1, hours: 40, description: "Development work" },
          { id: 2, hours: 20, description: "Code review" },
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
        reportType: "quarterly",
        generatedBy: "user",
        version: "1.1",
        content: {
          summary: "Q1 2024 quarterly report",
          sections: ["executive_summary", "metrics", "recommendations"],
        },
      },
      originalData: {
        sourceType: "tmetric",
        rawReports: [
          { id: 3, hours: 60, description: "Q1 development" },
          { id: 4, hours: 30, description: "Q1 testing" },
          { id: 5, hours: 20, description: "Q1 documentation" },
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
        reportType: "weekly",
        generatedBy: "system",
        version: "1.2",
        content: {
          summary: "Weekly progress report",
          sections: ["tasks", "milestones", "blockers"],
        },
      },
      originalData: {
        sourceType: "tmetric",
        rawReports: [
          { id: 6, hours: 8, description: "Monday development" },
          { id: 7, hours: 6, description: "Tuesday debugging" },
          { id: 8, hours: 4, description: "Wednesday testing" },
        ],
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
        filteredData = filteredData.filter((item) =>
          JSON.stringify(item.data).toLowerCase().includes(searchLower),
        );
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
