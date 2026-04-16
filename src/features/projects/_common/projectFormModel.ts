/** React Hook Form model for `ProjectForm` (also used by email preview `useWatch`). */
export type ProjectFormModel = {
  name: string;
  status: "draft" | "active" | "closed";
  description: string;
  clientId: number | null;
  workspaceIds: number[];
  defaultBillingDueDays: number;
  reportDefaults: {
    invoiceEmail: {
      titleTemplate: string;
      bodyMarkdownTemplate: string;
    };
    reminderEmail: {
      titleTemplate: string;
      bodyMarkdownTemplate: string;
    };
  };
};
