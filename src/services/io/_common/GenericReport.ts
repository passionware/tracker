import { Contractor } from "@/api/contractor/contractor.api";

export interface TaskType {
  name: string;
  description: string;
  parameters: Record<string, any>;
}
export interface ActivityType {
  name: string;
  description: string;
  parameters: Record<string, any>;
}
export interface ProjectType {
  name: string;
  description: string;
  parameters: Record<string, any>;
  // Optional budget caps (for future implementation)
  budgetCap?: {
    amount: number;
    currency: string;
  };
}
export interface RoleType {
  name: string;
  description: string;
  rates: Array<{
    billing: "hourly";
    activityType: string;
    taskType: string;
    projectId?: string; // Optional project-specific rate
    costRate: number; // What we pay the contractor
    costCurrency: string; // Currency for cost rate
    billingRate: number; // What we charge the client
    billingCurrency: string; // Currency for billing rate
  }>;
}
export interface GenericReport {
  definitions: {
    taskTypes: {
      [key: string]: TaskType;
    };
    activityTypes: {
      [key: string]: ActivityType;
    };
    projectTypes: {
      [key: string]: ProjectType;
    };
    roleTypes: {
      [key: string]: RoleType;
    };
  };
  timeEntries: Array<{
    id: string;
    note: string | null;
    taskId: string;
    activityId: string;
    projectId: string; // Required project assignment
    roleId: string;
    contractorId: Contractor["id"];
    createdAt: Date;
    updatedAt: Date;
    startAt: Date;
    endAt: Date;
  }>;
}
