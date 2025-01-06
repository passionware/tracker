import {
  Contractor,
  ContractorQuery,
} from "@/api/contractor/contractor.api.ts";
import {Maybe, RemoteData} from "@passionware/monads";

export interface ContractorService {
  useContractors: (query: ContractorQuery) => RemoteData<Contractor[]>;
  useContractor: (id: Maybe<Contractor["id"]>) => RemoteData<Contractor>;
}

export interface WithContractorService {
  contractorService: ContractorService;
}
