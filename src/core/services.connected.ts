import { BillingQuery, billingQuerySchema } from "@/api/billing/billing.api";
import { createBillingApi } from "@/api/billing/billing.api.http.ts";
import { ClientQuery, clientQuerySchema } from "@/api/clients/clients.api.ts";
import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createCockpitCubeReportsApi } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.http.ts";
import { createCockpitTenantsApi } from "@/api/cockpit-tenants/cockpit-tenants.api.http.ts";
import { createContractorApi } from "@/api/contractor/contractor.api.http.ts";
import { CostQuery, costQuerySchema } from "@/api/cost/cost.api";
import { createCostApi } from "@/api/cost/cost.api.http.ts";
import { myExchangeApi } from "@/api/exchange/exchange.api.connected.ts";
import { createGeneratedReportSourceApi } from "@/api/generated-report-source/generated-report-source.api.http";
import { myIterationTriggerApi } from "@/api/iteration-trigger/iteration-trigger.api.connected.ts";
import { createMutationApi } from "@/api/mutation/mutation.api.http.ts";
import { myProjectIterationApi } from "@/api/project-iteration/project-iteration.api.connected.ts";
import { myActivityApi } from "@/api/activity/activity.api.connected.ts";
import { myProjectRateApi } from "@/api/rate/rate.api.connected.ts";
import { myTaskDefinitionApi } from "@/api/task-definition/task-definition.api.connected.ts";
import { myTimeEntryApi } from "@/api/time-entry/time-entry.api.connected.ts";
import { createConnectedEventQueueStorage } from "@/api/time-event-queue/event-queue-storage.connected.ts";
import { myTimeEventsWorkerClient } from "@/api/time-event-queue/time-events-worker-client.connected.ts";
import { ProjectQuery, projectQuerySchema } from "@/api/project/project.api";
import { myProjectApi } from "@/api/project/project.api.connected.ts";
import { createReportsApi } from "@/api/reports/reports.api.http.ts";
import { ReportQuery, reportQuerySchema } from "@/api/reports/reports.api.ts";
import {
  DashboardQuery,
  dashboardQuerySchema,
} from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { createTmetricDashboardCacheApi } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api.http";
import { UserQuery, userQuerySchema } from "@/api/user/user.api";
import {
  VariableQuery,
  variableQuerySchema,
} from "@/api/variable/variable.api";
import { createVariableApi } from "@/api/variable/variable.api.http.ts";
import {
  WorkspaceQuery,
  workspaceQuerySchema,
} from "@/api/workspace/workspace.api.ts";
import { createWorkspaceApi } from "@/api/workspace/workspace.api.http.ts";
import { clientCockpitSupabase } from "@/core/clientSupabase.connected.ts";
import { FrontServices } from "@/core/frontServices.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { createClientCubeReportService } from "@/services/cockpit/ClientCubeReportService/ClientCubeReportService.impl.ts";
import { createCockpitTenantService } from "@/services/cockpit/CockpitTenantService/CockpitTenantService.impl.ts";
import { createExchangeService } from "@/services/ExchangeService/ExchangeService.impl.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { myDialogService } from "@/services/front/DialogService/DialogService.impl.connected";
import { createAiMatchingService } from "@/services/front/AiMatchingService/AiMatchingService.impl.ts";
import { createExpressionService } from "@/services/front/ExpressionService/ExpressionService.impl.ts";
import { createGeneratedReportViewService } from "@/services/front/GeneratedReportViewService/GeneratedReportViewService.impl.ts";
import { createProjectIterationDisplayService } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.impl.ts";
import { createReconciliationService } from "@/services/front/ReconciliationService/ReconciliationService.impl.tsx";
import { createReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.impl.ts";
import { createTmetricDashboardService } from "@/services/front/TmetricDashboardService/TmetricDashboardService.impl.ts";
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
import { createGeneratedReportSourceService } from "@/services/io/GeneratedReportSourceService/GeneratedReportSourceService.impl.ts";
import { createGeneratedReportSourceWriteService } from "@/services/io/GeneratedReportSourceWriteService/GeneratedReportSourceWriteService.impl";
import { createActivityService } from "@/services/io/ActivityService/ActivityService.impl.ts";
import { createIterationTriggerService } from "@/services/io/IterationTriggerService/IterationTriggerService.impl.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.impl.ts";
import { createProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.impl.ts";
import { createEventQueueService } from "@/services/io/EventQueueService/EventQueueService.impl.ts";
import { createProjectRateService } from "@/services/io/ProjectRateService/ProjectRateService.impl.ts";
import { createProjectService } from "@/services/io/ProjectService/ProjectService.impl.ts";
import { createTaskDefinitionService } from "@/services/io/TaskDefinitionService/TaskDefinitionService.impl.ts";
import { createTimeEntryService } from "@/services/io/TimeEntryService/TimeEntryService.impl.ts";
import { createTmetricPlugin } from "@/services/io/ReportGenerationService/plugins/tmetric/TmetricPlugin";
import { createReportGenerationService } from "@/services/io/ReportGenerationService/ReportGenerationService.impl";
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
const queryParamsService = createQueryParamsService<{
  projects: ProjectQuery;
  users: UserQuery;
  reports: ReportQuery;
  billing: BillingQuery;
  clients: ClientQuery;
  workspaces: WorkspaceQuery;
  costs: CostQuery;
  variables: VariableQuery;
  dashboard: DashboardQuery;
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
    clients: clientQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => ClientQuery,
    workspaces: workspaceQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => WorkspaceQuery,
    costs: costQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => CostQuery,
    variables: variableQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => VariableQuery,
    dashboard: dashboardQuerySchema.parse as (
      params: Record<string, unknown>,
    ) => DashboardQuery,
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
const aiMatchingService = createAiMatchingService({ variableService });

const exchangeService = createExchangeService(myExchangeApi, myQueryClient);
const formatService = createFormatService(() => new Date());

const projectIterationService = createProjectIterationService({
  services: {
    messageService,
  },
  api: myProjectIterationApi,
  client: myQueryClient,
});
const iterationTriggerService = createIterationTriggerService({
  services: {
    messageService,
  },
  api: myIterationTriggerApi,
  client: myQueryClient,
});
const timeEntryService = createTimeEntryService({
  services: { messageService },
  api: myTimeEntryApi,
  client: myQueryClient,
});
const taskDefinitionService = createTaskDefinitionService({
  services: { messageService },
  api: myTaskDefinitionApi,
  client: myQueryClient,
});
const activityService = createActivityService({
  services: { messageService },
  api: myActivityApi,
  client: myQueryClient,
});
const projectRateService = createProjectRateService({
  services: { messageService },
  api: myProjectRateApi,
  client: myQueryClient,
});

/**
 * The offline event queue: durable IndexedDB FIFO + per-stream flush
 * worker. The schema tag scopes the IDB database name so dev / prod
 * queues never collide. The actor user id is read lazily from the shared
 * Supabase session each submit (so it's always the currently-signed-in
 * user, even after a refresh).
 */
const eventQueueService = createEventQueueService({
  services: { messageService },
  storage: createConnectedEventQueueStorage({
    schemaTag: import.meta.env.VITE_APP_TIME_DB_SCHEMA ?? "time_dev",
  }),
  workerClient: myTimeEventsWorkerClient,
  actorUserId: () => "anonymous",
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

const projectService = createProjectService({
  api: myProjectApi,
  client: myQueryClient,
  services: {
    messageService,
  },
});
export const myServices = {
  aiMatchingService,
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
  navigationService,
  queryParamsService,
  locationService: createLocationService({
    services: {
      navigationService,
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
  projectIterationService,
  iterationTriggerService,
  timeEntryService,
  taskDefinitionService,
  activityService,
  projectRateService,
  eventQueueService,
  projectIterationDisplayService: createProjectIterationDisplayService(),
  projectService,
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
  tmetricDashboardService: createTmetricDashboardService({
    cacheApi: createTmetricDashboardCacheApi(mySupabase),
    projectIterationApi: myProjectIterationApi,
    client: myQueryClient,
    contractorApi: createContractorApi(mySupabase),
    services: {
      projectService,
      projectIterationService,
      expressionService,
    },
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
