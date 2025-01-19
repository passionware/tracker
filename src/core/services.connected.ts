import { createBillingApi } from "@/api/billing/billing.api.http.ts";
import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createContractorApi } from "@/api/contractor/contractor.api.http.ts";
import { createCostApi } from "@/api/cost/cost.api.http.ts";
import { myExchangeApi } from "@/api/exchange/exchange.api.connected.ts";
import { createMutationApi } from "@/api/mutation/mutation.api.http.ts";
import { createReportsApi } from "@/api/reports/reports.api.http.ts";
import { createVariableApi } from "@/api/variable/variable.api.http.ts";
import { createWorkspaceApi } from "@/api/workspace/workspace.api.http.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { createExchangeService } from "@/services/ExchangeService/ExchangeService.impl.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { createReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.impl.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { createLocationService } from "@/services/internal/LocationService/LocationService.impl.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { createMessageService } from "@/services/internal/MessageService/MessageService.impl.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { createNavigationService } from "@/services/internal/NavigationService/NavigationService.impl.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { createPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.impl.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { createAuthService } from "@/services/io/AuthService/AuthService.impl.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { createBillingService } from "@/services/io/BillingService/BillingService.impl.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.impl.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.impl.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { createCostService } from "@/services/io/CostService/CostService.impl.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.impl.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { createReportService } from "@/services/io/ReportService/ReportService.impl.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { createVariableService } from "@/services/io/VariableService/Variable.service.impl.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.impl.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { createSimpleEvent } from "@passionware/simple-event";
import { useRef } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

const navigationInjectEvent = createSimpleEvent<NavigateFunction>();

const messageService = createMessageService();
const navigationService = createNavigationService(navigationInjectEvent);
const routingService = createRoutingService();
const reportService = createReportService(
  createReportsApi(mySupabase),
  myQueryClient,
  messageService,
);
const billingService = createBillingService(
  createBillingApi(mySupabase),
  myQueryClient,
  messageService,
);
const workspaceService = createWorkspaceService(
  createWorkspaceApi(mySupabase),
  myQueryClient,
  messageService,
);
const preferenceService = createPreferenceService();
const costService = createCostService(
  createCostApi(mySupabase),
  myQueryClient,
  messageService,
);
export const myServices = {
  authService: createAuthService(mySupabase),
  clientService: createClientService(
    createClientsApi(mySupabase),
    myQueryClient,
    messageService,
  ),
  reportService: reportService,
  routingService,
  navigationService,
  locationService: createLocationService({
    services: {
      navigationService,
      routingService,
    },
  }),
  formatService: createFormatService(() => new Date()),
  reportDisplayService: createReportDisplayService({
    services: {
      reportService: reportService,
      billingService: billingService,
      workspaceService,
      costService,
      exchangeService: createExchangeService(myExchangeApi, myQueryClient),
    },
  }),
  messageService,
  mutationService: createMutationService(
    {
      services: {
        messageService,
        preferenceService,
      },
    },
    createMutationApi(mySupabase),
  ),
  contractorService: createContractorService(
    createContractorApi(mySupabase),
    myQueryClient,
    messageService,
  ),
  workspaceService,
  costService,
  preferenceService,
  variableService: createVariableService({
    services: {
      messageService,
    },
    client: myQueryClient,
    api: createVariableApi(mySupabase),
  }),
  billingService,
} satisfies MergeServices<
  [
    WithAuthService,
    WithClientService,
    WithReportService,
    WithLocationService,
    WithNavigationService,
    WithRoutingService,
    WithFormatService,
    WithReportDisplayService,
    WithMessageService,
    WithMutationService,
    WithContractorService,
    WithWorkspaceService,
    WithCostService,
    WithPreferenceService,
    WithVariableService,
    WithBillingService,
  ]
>;

export function NavigationServiceInject() {
  const navigate = useNavigate();
  const ref = useRef<NavigateFunction>();
  if (maybe.isAbsent(ref.current)) {
    ref.current = navigate;
    navigationInjectEvent.emit(navigate);
  }
  return null;
}
