import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { costMock } from "@/api/cost/cost.mock.ts";
import { CostService } from "@/services/io/CostService/CostService.ts";
import { maybe, rd } from "@passionware/monads";

export function createCostService(): CostService {
  const data = costMock.static.list.map((x) => ({
    ...x,
    contractor: maybe.getOrThrow(
      contractorMock.static.list.find((c) => c.id === x.contractorId),
    ),
    linkReports: [],
  }));
  return {
    useCosts: () => rd.of(data),
    useCost: (id) =>
      rd.of(maybe.getOrThrow(data.find((cost) => cost.id === id))),
  };
}
