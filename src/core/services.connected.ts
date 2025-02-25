import { createBillingApi } from "@/api/billing/billing.api.http.ts";
import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createContractorApi } from "@/api/contractor/contractor.api.http.ts";
import { createCostApi } from "@/api/cost/cost.api.http.ts";
import { myExchangeApi } from "@/api/exchange/exchange.api.connected.ts";
import { createMutationApi } from "@/api/mutation/mutation.api.http.ts";
import { myProjectIterationApi } from "@/api/project-iteration/project-iteration.api.connected.ts";
import { myProjectApi } from "@/api/project/project.api.connected.ts";
import { createReportsApi } from "@/api/reports/reports.api.http.ts";
import { createVariableApi } from "@/api/variable/variable.api.http.ts";
import { createWorkspaceApi } from "@/api/workspace/workspace.api.http.ts";
import { FrontServices } from "@/core/frontServices.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { createExchangeService } from "@/services/ExchangeService/ExchangeService.impl.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { createExpressionService } from "@/services/front/ExpressionService/ExpressionService.impl.ts";
import { createProjectIterationDisplayService } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.impl.ts";
import { createReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.impl.ts";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl.ts";
import { createLocationService } from "@/services/internal/LocationService/LocationService.impl.ts";
import { createMessageService } from "@/services/internal/MessageService/MessageService.impl.ts";
import { createNavigationService } from "@/services/internal/NavigationService/NavigationService.impl.ts";
import { createPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.impl.ts";
import { createAuthService } from "@/services/io/AuthService/AuthService.impl.ts";
import { createBillingService } from "@/services/io/BillingService/BillingService.impl.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.impl.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.impl.ts";
import { createCostService } from "@/services/io/CostService/CostService.impl.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.impl.ts";
import { createProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.impl.ts";
import { createProjectService } from "@/services/io/ProjectService/ProjectService.impl.ts";
import { createReportService } from "@/services/io/ReportService/ReportService.impl.ts";
import { createVariableService } from "@/services/io/VariableService/Variable.service.impl.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.impl.ts";
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
const variableService = createVariableService({
  services: {
    messageService,
  },
  client: myQueryClient,
  api: createVariableApi(mySupabase),
});
const projectIterationService = createProjectIterationService({
  services: {
    messageService,
  },
  api: myProjectIterationApi,
  client: myQueryClient,
});
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
  variableService,
  billingService,
  expressionService: createExpressionService({
    services: {
      variableService,
    },
  }),
  projectService: createProjectService({
    api: myProjectApi,
    client: myQueryClient,
    services: {
      messageService,
    },
  }),
  projectIterationService,
  projectIterationDisplayService: createProjectIterationDisplayService({
    projectIterationService,
  }),
} satisfies FrontServices;

export function NavigationServiceInject() {
  const navigate = useNavigate();
  const ref = useRef<NavigateFunction>(null);
  if (maybe.isAbsent(ref.current)) {
    ref.current = navigate;
    navigationInjectEvent.emit(navigate);
  }
  return null;
}
