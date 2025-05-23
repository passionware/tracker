import { Project } from "@/api/project/project.api.ts";
import { Variable } from "@/api/variable/variable.api.ts";
import { variableMock } from "@/api/variable/variable.mock.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { FormatService } from "@/services/FormatService/FormatService.ts";
import { createExpressionService } from "@/services/front/ExpressionService/ExpressionService.impl.ts";
import { ExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl.ts";
import { RoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { createNavigationService } from "@/services/internal/NavigationService/NavigationService.mock.ts";
import { NavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { createPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.mock.ts";
import { PreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.mock.ts";
import { ClientService } from "@/services/io/ClientService/ClientService.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.mock.ts";
import { ContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.mock.ts";
import { MutationService } from "@/services/io/MutationService/MutationService.ts";
import { createProjectService } from "@/services/io/ProjectService/ProjectService.mock.ts";
import { createVariableService } from "@/services/io/VariableService/VariableService.mock.ts";
import { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import { WorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import {
  createArgsAccessor,
  createArgsDecorator,
  TestQuery,
} from "@passionware/platform-storybook";

const factories = {
  workspace: createWorkspaceService,
  client: createClientService,
  contractor: createContractorService,
  variable: createVariableService,
  preference: createPreferenceService,
  project: createProjectService,
  routing: createRoutingService,
} as const;

type FactoryArgs = {
  [K in keyof typeof factories]: Parameters<(typeof factories)[K]>[0];
};

type SbServiceConfig = {
  workspace?: true | FactoryArgs["workspace"];
  client?: true | FactoryArgs["client"];
  contractor?: true | FactoryArgs["contractor"];
  variable?: true | FactoryArgs["variable"]["accessor"];
  project?: true | FactoryArgs["project"];
  format?: true;
  expression?: true;
  preference?: true | FactoryArgs["preference"];
};

type OutputServices<C extends SbServiceConfig> = {
  workspaceService: C["workspace"] extends true ? WorkspaceService : undefined;
  clientService: C["client"] extends true ? ClientService : never;
  contractorService: C["contractor"] extends true
    ? ContractorService
    : undefined;
  variableService: C["variable"] extends true ? VariableService : undefined;
  formatService: C["format"] extends true ? FormatService : undefined;
  expressionService: C["expression"] extends true
    ? ExpressionService
    : undefined;
  preferenceService: C["preference"] extends true
    ? PreferenceService
    : undefined;
  mutationService: MutationService;
  projectService: C["project"] extends true
    ? ReturnType<typeof createProjectService>
    : never;
  navigationService: NavigationService;
  routingService: RoutingService;
};

/**
 * Create useful services for storybook
 * @param config
 */
export function createSbServices<SC extends SbServiceConfig>(config?: SC) {
  const decorator = createArgsDecorator<{
    onAction: () => void;
    variables: RemoteData<Variable[]>;
    dangerMode: boolean;
    project: TestQuery<Project>;
    projects: TestQuery<Project[]>;
  }>();

  const variableService =
    config?.variable || config?.expression
      ? factories.variable({
          onAction: createArgsAccessor(decorator).forArg("onAction").get,
          accessor: createArgsAccessor(decorator).forArg("variables"),
        })
      : undefined;
  const args = {
    services: {
      workspaceService: config?.workspace ? factories.workspace() : undefined,
      clientService: config?.client ? factories.client() : undefined,
      contractorService: config?.contractor
        ? factories.contractor()
        : undefined,
      variableService: variableService,
      formatService: config?.format
        ? createFormatService(() => new Date())
        : undefined,
      expressionService: config?.expression
        ? createExpressionService({
            services: { variableService: maybe.getOrThrow(variableService) },
          })
        : undefined,
      mutationService: createMutationService(
        createArgsAccessor(decorator).forArg("onAction"),
      ),
      preferenceService: config?.preference
        ? createPreferenceService({
            dangerMode: createArgsAccessor(decorator).forArg("dangerMode"),
            onAction: createArgsAccessor(decorator).forArg("onAction"),
          })
        : undefined,
      projectService: config?.project
        ? createProjectService({
            itemAccessor: createArgsAccessor(decorator).forArg("project"),
            listAccessor: createArgsAccessor(decorator).forArg("projects"),
          })
        : undefined,
      navigationService: createNavigationService(
        createArgsAccessor(decorator).forArg("onAction"),
      ),
      routingService: createRoutingService(),
    } as unknown as OutputServices<SC>,
    workspace: config?.workspace ? factories.workspace() : undefined,
    client: config?.client ? factories.client() : undefined,
    contractor: config?.contractor ? factories.contractor() : undefined,
    variable:
      config?.variable === true
        ? rd.of(variableMock.static.list)
        : config?.variable,
    dangerMode: false,
  };

  return {
    decorator,
    args,
    argTypes: {
      onAction: {
        action: "onAction",
      },
    },
  };
}

export type ArgsWithServices<
  T,
  Sb extends ReturnType<typeof createSbServices>,
> = T & (Sb extends { args: infer A } ? A : never);
