import { MutationApi } from "@/api/mutation/mutation.api.ts";

export type MutationService = MutationApi;

export interface WithMutationService {
  mutationService: MutationService;
}
