import { Project } from "@/api/project/project.api.ts";
import { projectMock } from "@/api/project/project.mock.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import {
  ProjectListWidget,
  ProjectListWidgetProps,
} from "@/features/projects/ProjectListWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { createGuardedAccessor } from "@/platform/lang/guardedAccessor.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createStaticAccessor } from "@/services/_common/createStaticAccessor.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl.ts";
import { createPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.mock.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.mock.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.mock.ts";
import { createProjectService } from "@/services/io/ProjectService/ProjectService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import { rd } from "@passionware/monads";
import {
  createArgsAccessor,
  createArgsDecorator,
  PropsWithActionHandler,
  testQuery,
  TestQuery,
} from "@passionware/platform-storybook";
import type { StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";

type Args = ProjectListWidgetProps &
  PropsWithActionHandler & {
    projects: TestQuery<Project[]>;
  };
const args = createArgsDecorator<Args>();

const onAction = createArgsAccessor(args).forArg("onAction");
const meta = {
  decorators: [
    args.argsDecorator,
    (Story) => (
      <MemoryRouter>
        <Layout sidebarSlot={<div>sidebar</div>}>{Story()}</Layout>
      </MemoryRouter>
    ),
  ],
  component: ProjectListWidget,
  args: {
    services: createGuardedAccessor(
      {
        routingService: createRoutingService(),
        projectService: createProjectService({
          listAccessor: createArgsAccessor(args).forArg("projects"),
          itemAccessor: createStaticAccessor(testQuery.of(rd.ofIdle())),
        }),
        workspaceService: createWorkspaceService(),
        clientService: createClientService(),
        formatService: createFormatService(() => new Date()),
        preferenceService: createPreferenceService({
          dangerMode: createStaticAccessor(false),
          onAction,
        }),
        mutationService: createMutationService(onAction),
      },
      "Service %s not available",
    ),
    clientId: 123,
    workspaceId: workspaceMock.static.list[0].id,
    filter: { operator: "oneOf", value: ["active"] },
    projects: testQuery.of(rd.of(projectMock.static.list), 1000),
  },
  argTypes: {
    onAction: { action: "onAction" },
  },
} satisfies FixedMeta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const Default = {} satisfies Story;
