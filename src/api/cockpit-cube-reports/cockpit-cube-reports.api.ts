export interface CockpitCubeReport {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  cube_data: Record<string, unknown>;
  cube_config: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface CockpitCubeReportWithCreator
  extends Omit<CockpitCubeReport, "start_date" | "end_date"> {
  creator_email?: string;
  creator_name?: string;
  start_date: Date;
  end_date: Date;
}

export interface CockpitCubeReportsApi {
  listReports: (tenantId: string) => Promise<CockpitCubeReportWithCreator[]>;
  getReport: (reportId: string) => Promise<CockpitCubeReportWithCreator>;
  createReport: (
    tenantId: string,
    userId: string,
    clientId: number,
    report: {
      name: string;
      description?: string;
      cube_data: Record<string, unknown>;
      cube_config: Record<string, unknown>;
    },
  ) => Promise<CockpitCubeReport>;
  updateReport: (
    reportId: string,
    updates: Partial<{
      name: string;
      description: string;
      cube_data: Record<string, unknown>;
      cube_config: Record<string, unknown>;
    }>,
  ) => Promise<CockpitCubeReport>;
  deleteReport: (reportId: string) => Promise<void>;
  logAccess: (
    tenantId: string,
    userId: string,
    reportId: string,
  ) => Promise<void>;
  getAccessStats: (
    reportId: string,
    tenantId: string,
  ) => Promise<{
    totalAccesses: number;
    uniqueUsers: number;
    lastAccessedAt: string | null;
  }>;
}
