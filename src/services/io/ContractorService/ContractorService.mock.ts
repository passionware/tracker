import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { ContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { maybe, rd } from "@passionware/monads";

export function createContractorService(): ContractorService {
  return {
    useContractors: () => rd.of(contractorMock.static.list),
    useContractor: (id) =>
      maybe.mapOrElse(
        id,
        (id) =>
          rd.of(
            maybe.getOrThrow(
              contractorMock.static.list.find((c) => c.id === id),
              "Contractor not found",
            ),
          ),
        rd.ofIdle(),
      ),
  };
}
