import type { Project, ProjectPayload } from "@/api/project/project.api.ts";

/** Shape expected by `ProjectForm` defaults and `project-form` stack entity. */
export function projectPayloadFromProject(project: Project): ProjectPayload {
  return {
    name: project.name,
    status: project.status,
    description: project.description,
    clientId: project.clientId,
    workspaceIds: project.workspaceIds,
    defaultBillingDueDays: project.defaultBillingDueDays,
    emailReplyInviteMessage: project.emailReplyInviteMessage,
    emailSubjectTemplateInvoice: project.emailSubjectTemplateInvoice,
    emailSubjectTemplateReminder: project.emailSubjectTemplateReminder,
  };
}
