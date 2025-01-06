import { createClientBillingApi } from "@/api/client-billing/client-billing.api.http.ts";
import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createContractorReportsApi } from "@/api/contractor-reports/contractor-reports.api.http.ts";
import { createMutationApi } from "@/api/mutation/mutation.api.http.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
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
import { createAuthService } from "@/services/io/AuthService/AuthService.impl.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { createClientBillingService } from "@/services/io/ClientBillingService/ClientBillingService.impl.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.impl.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { createContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.impl.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.impl.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { maybe } from "@passionware/monads";
import { createSimpleEvent } from "@passionware/simple-event";
import { useRef } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

const navigationInjectEvent = createSimpleEvent<NavigateFunction>();

const messageService = createMessageService();
const navigationService = createNavigationService(navigationInjectEvent);
const routingService = createRoutingService();
const contractorReportService = createContractorReportService(
  createContractorReportsApi(mySupabase),
  myQueryClient,
  messageService,
);
const clientBillingService = createClientBillingService(
  createClientBillingApi(mySupabase),
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
  contractorReportService,
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
      contractorReportService,
      clientBillingService,
    },
  }),
  messageService,
  mutationService: createMutationService(
    {
      services: {
        messageService,
      },
    },
    createMutationApi(mySupabase),
  ),
} satisfies MergeServices<
  [
    WithAuthService,
    WithClientService,
    WithContractorReportService,
    WithLocationService,
    WithNavigationService,
    WithRoutingService,
    WithFormatService,
    WithReportDisplayService,
    WithMessageService,
    WithMutationService,
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
