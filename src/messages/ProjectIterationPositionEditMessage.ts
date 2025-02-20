import { ProjectIterationPositionPayload } from "@/api/project-iteration/project-iteration.api.ts";

export interface ProjectIterationPositionEditMessage {
  request: {
    defaultValues: Partial<ProjectIterationPositionPayload>;
    currency: string;
    operatingMode: "create" | "edit" | "duplicate";
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        payload: ProjectIterationPositionPayload;
        changes: Partial<ProjectIterationPositionPayload>;
      };
}
