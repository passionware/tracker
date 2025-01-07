import { Cost, CostQuery } from "@/api/cost/cost.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface CostService {
  useCosts: (query: CostQuery) => RemoteData<Cost[]>;
  useCost: (id: Maybe<number>) => RemoteData<Cost>;
}
