import { createTaskDefinitionApi } from "@/api/task-definition/task-definition.api.http";
import { timeSupabase } from "@/core/timeSupabase.connected";

export const myTaskDefinitionApi = createTaskDefinitionApi(timeSupabase);
