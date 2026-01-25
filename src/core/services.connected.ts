import { createBillingApi } from "@/api/billing/billing.api.http.ts";
import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createCockpitCubeReportsApi } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.http.ts";
import { createCockpitTenantsApi } from "@/api/cockpit-tenants/cockpit-tenants.api.http.ts";
import { createContractorApi } from "@/api/contractor/contractor.api.http.ts";
import { createCostApi } from "@/api/cost/cost.api.http.ts";
import { myExchangeApi } from "@/api/exchange/exchange.api.connected.ts";
import { createGeneratedReportSourceApi } from "@/api/generated-report-source/generated-report-source.api.http";
import { createMutationApi } from "@/api/mutation/mutation.api.http.ts";
import { myProjectIterationApi } from "@/api/project-iteration/project-iteration.api.connected.ts";
import { myProjectApi } from "@/api/project/project.api.connected.ts";
import { createReportsApi } from "@/api/reports/reports.api.http.ts";
import { createVariableApi } from "@/api/variable/variable.api.http.ts";
import { createWorkspaceApi } from "@/api/workspace/workspace.api.http.ts";
import { BillingQuery, billingQuerySchema } from "@/api/billing/billing.api";
import { CostQuery, costQuerySchema } from "@/api/cost/cost.api";
import { ProjectQuery, projectQuerySchema } from "@/api/project/project.api";
import { ReportQuery, reportQuerySchema } from "@/api/reports/reports.api.ts";
import { UserQuery, userQuerySchema } from "@/api/user/user.api";
import {
  VariableQuery,
  variableQuerySchema,
} from "@/api/variable/variable.api";
import { FrontServices } from "@/core/frontServices.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { clientCockpitSupabase } from "@/core/clientSupabase.connected.ts";
import { createExchangeService } from "@/services/ExchangeService/ExchangeService.impl.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { createExpressionService } from "@/services/front/ExpressionService/ExpressionService.impl.ts";
import { createGeneratedReportViewService } from "@/services/front/GeneratedReportViewService/GeneratedReportViewService.impl.ts";
import { createProjectIterationDisplayService } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.impl.ts";
import { createReconciliationService } from "@/services/front/ReconciliationService/ReconciliationService.impl.tsx";
import { createReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.impl.ts";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl.ts";
import { createLocationService } from "@/services/internal/LocationService/LocationService.impl.ts";
import { createMessageService } from "@/services/internal/MessageService/MessageService.impl.ts";
import { createNavigationService } from "@/services/internal/NavigationService/NavigationService.impl.ts";
import { createPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.impl.ts";
import { createQueryParamsService } from "@/services/internal/QueryParamsService/QueryParamsService.impl.ts";
import { createAuthService } from "@/services/io/AuthService/AuthService.impl.ts";
import { createBillingService } from "@/services/io/BillingService/BillingService.impl.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.impl.ts";
import { createCockpitAuthService } from "@/services/io/CockpitAuthService/CockpitAuthService.impl.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.impl.ts";
import { createCostService } from "@/services/io/CostService/CostService.impl.ts";
import { createClientCubeReportService } from "@/services/cockpit/ClientCubeReportService/ClientCubeReportService.impl.ts";
import { createCockpitTenantService } from "@/services/cockpit/CockpitTenantService/CockpitTenantService.impl.ts";
import { createGeneratedReportSourceService } from "@/services/io/GeneratedReportSourceService/GeneratedReportSourceService.impl.ts";
import { createGeneratedReportSourceWriteService } from "@/services/io/GeneratedReportSourceWriteService/GeneratedReportSourceWriteService.impl";
import { createMutationService } from "@/services/io/MutationService/MutationService.impl.ts";
import { createProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.impl.ts";
import { createProjectService } from "@/services/io/ProjectService/ProjectService.impl.ts";
import { createTmetricPlugin } from "@/services/io/ReportGenerationService/plugins/tmetric/TmetricPlugin";
import { createReportGenerationService } from "@/services/io/ReportGenerationService/ReportGenerationService.impl";
import { createReportService } from "@/services/io/ReportService/ReportService.impl.ts";
import { createVariableService } from "@/services/io/VariableService/Variable.service.impl.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.impl.ts";
import { maybe } from "@passionware/monads";
import { createSimpleEvent } from "@passionware/simple-event";
import { useRef } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { myDialogService } from "@/services/front/DialogService/DialogService.impl.connected";

const navigationInjectEvent = createSimpleEvent<NavigateFunction>();

const messageService = createMessageService();
const navigationService = createNavigationService(navigationInjectEvent);
const routingService = createRoutingService();
const queryParamsService = createQueryParamsService<{
  projects: ProjectQuery;
  users: UserQuery;
  reports: ReportQuery;
  billing: BillingQuery;
  costs: CostQuery;
  variables: VariableQuery;
}>({
  navigationService,
  parseQueryParams: {
    projects: projectQuerySchema.parse,
    users: userQuerySchema.parse,
    reports: reportQuerySchema.parse as (
      params: Record<string, unknown>, // todo: we have some issues that enum filter<unknown> is inferred but should be more concrete
    ) => ReportQuery,
    billing: billingQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => BillingQuery,
    costs: costQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => CostQuery,
    variables: variableQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => VariableQuery,
  },
});
const generatedReportSourceApi = createGeneratedReportSourceApi(mySupabase);
const generatedReportSourceWriteService =
  createGeneratedReportSourceWriteService({
    services: { messageService },
    api: generatedReportSourceApi,
  });
const generatedReportSourceService = createGeneratedReportSourceService({
  services: { messageService },
  client: myQueryClient,
  api: generatedReportSourceApi,
});
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

const exchangeService = createExchangeService(myExchangeApi, myQueryClient);
const formatService = createFormatService(() => new Date());

const projectIterationService = createProjectIterationService({
  services: {
    messageService,
  },
  api: myProjectIterationApi,
  client: myQueryClient,
});
const expressionService = createExpressionService({
  services: {
    variableService,
  },
});
const mutationService = createMutationService(
  {
    services: {
      messageService,
      preferenceService,
    },
  },
  createMutationApi(mySupabase),
);

export const myServices = {
  authService: createAuthService(mySupabase),
  cockpitAuthService: createCockpitAuthService(clientCockpitSupabase),
  clientService: createClientService(
    createClientsApi(mySupabase),
    myQueryClient,
    messageService,
  ),
  clientCubeReportService: createClientCubeReportService(
    createCockpitCubeReportsApi(clientCockpitSupabase),
    myQueryClient,
  ),
  cockpitTenantService: createCockpitTenantService(
    createCockpitTenantsApi(clientCockpitSupabase),
    myQueryClient,
  ),
  reportService: reportService,
  routingService,
  navigationService,
  queryParamsService,
  locationService: createLocationService({
    services: {
      navigationService,
      routingService,
    },
  }),
  reportDisplayService: createReportDisplayService({
    services: {
      reportService: reportService,
      billingService: billingService,
      workspaceService,
      costService,
      exchangeService,
    },
  }),
  messageService,
  mutationService,
  reconciliationService: (() => {
    const reportDisplayService = createReportDisplayService({
      services: {
        reportService: reportService,
        billingService: billingService,
        workspaceService,
        costService,
        exchangeService,
      },
    });
    const projectService = createProjectService({
      api: myProjectApi,
      client: myQueryClient,
      services: {
        messageService,
      },
    });
    return createReconciliationService({
      services: {
        mutationService,
        reportDisplayService,
        billingService,
        costService,
        projectService,
      },
    });
  })(),
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
  expressionService,
  projectService: createProjectService({
    api: myProjectApi,
    client: myQueryClient,
    services: {
      messageService,
    },
  }),
  projectIterationService,
  projectIterationDisplayService: createProjectIterationDisplayService(),
  reportGenerationService: createReportGenerationService({
    services: {
      reportService,
      generatedReportSourceWriteService,
    },
    plugins: {
      tmetric: createTmetricPlugin({
        services: { expressionService },
      }),
    },
  }),
  generatedReportSourceWriteService,
  generatedReportSourceService,
  formatService,
  exchangeService,
  generatedReportViewService: createGeneratedReportViewService(),
  dialogService: myDialogService,
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
