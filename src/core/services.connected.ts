import { createClientsApi } from "@/api/clients/clients.api.http.ts";
import { createContractorReportsApi } from "@/api/contractor-reports/contractor-reports.api.http.ts";
import { myQueryClient } from "@/core/query.connected.ts";
import { mySupabase } from "@/core/supabase.connected.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { createLocationService } from "@/services/internal/LocationService/LocationService.impl.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { createNavigationService } from "@/services/internal/NavigationService/NavigationService.impl.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { createAuthService } from "@/services/io/AuthService/AuthService.impl.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.impl.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { createContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.impl.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { maybe } from "@passionware/monads";
import { createSimpleEvent } from "@passionware/simple-event";
import { useRef } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

const navigationInjectEvent = createSimpleEvent<NavigateFunction>();

const navigationService = createNavigationService(navigationInjectEvent);
const routingService = createRoutingService();
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
  routingService,
  navigationService,
  locationService: createLocationService({
    services: {
      navigationService,
      routingService,
    },
  }),
} satisfies MergeServices<
  [
    WithAuthService,
    WithClientService,
    WithContractorReportService,
    WithLocationService,
    WithNavigationService,
    WithRoutingService,
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
