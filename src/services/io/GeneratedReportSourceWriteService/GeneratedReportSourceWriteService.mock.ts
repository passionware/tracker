import { createGeneratedReportSourceMock } from "@/api/generated-report-source/generated-report-source.mock.ts";
import { GeneratedReportSourceWriteService } from "@/services/io/GeneratedReportSourceWriteService/GeneratedReportSourceWriteService.ts";

export function createGeneratedReportSourceWriteServiceMock(): GeneratedReportSourceWriteService {
  const mockApi = createGeneratedReportSourceMock();

  return {
    createGeneratedReportSource: async (payload) => {
      const response = await mockApi.createGeneratedReportSource(payload);
      // Simulate message service effect
      console.log("Mock: Creating generated report source", payload);
      return response;
    },

    updateGeneratedReportSource: async (id, payload) => {
      const response = await mockApi.updateGeneratedReportSource(id, payload);
      // Simulate message service effect
      console.log("Mock: Updating generated report source", id, payload);
      return response;
    },

    deleteGeneratedReportSource: async (id) => {
      await mockApi.deleteGeneratedReportSource(id);
      // Simulate message service effect
      console.log("Mock: Deleting generated report source", id);
    },
  };
}
