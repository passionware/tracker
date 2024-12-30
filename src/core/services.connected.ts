import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createContractorReportsApi } from "@/api/contractor-reports/contractor-reports.api.http.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { createAuthService } from "@/services/io/AuthService/AuthService.impl.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.impl.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { createContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.impl.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";

export const myServices = {
  authService: createAuthService(mySupabase),
  clientService: createClientService(
    createClientsApi(mySupabase),
    myQueryClient,
  ),
  contractorReportService: createContractorReportService(
    createContractorReportsApi(mySupabase),
    myQueryClient,
  ),
} satisfies MergeServices<
  [WithAuthService, WithClientService, WithContractorReportService]
>;
