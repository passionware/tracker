import type { Client } from "@/api/clients/clients.api.ts";
import type { Project } from "@/api/project/project.api.ts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createClientServiceForEntityStripStory } from "@/services/io/ClientService/ClientService.mock.ts";
import { createProjectServiceForEntityStripStory } from "@/services/io/ProjectService/ProjectService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";

import { DrawerContextEntityStrip } from "./DrawerContextEntityStrip.tsx";
import { Workspace } from "@/api/workspace/workspace.api.ts";

const demoClient = {
  id: 42,
  name: "Northwind LLC",
  avatarUrl: null as string | null,
  senderName: "NORTHWIND PAY" as string | null,
  hidden: false,
} satisfies Client;

const demoProject = {
  id: 99,
  name: "Website redesign",
  status: "active" as const,
  description: null,
  workspaceIds: [7],
  clientId: demoClient.id,
  createdAt: new Date("2024-01-01"),
  defaultBillingDueDays: 14,
  reportDefaults: {},
} satisfies Project;

const services = {
  clientService: createClientServiceForEntityStripStory(
    demoClient.id,
    demoClient,
  ),
  projectService: createProjectServiceForEntityStripStory(
    demoProject.id,
    demoProject,
  ),
  workspaceService: createWorkspaceService(),
};

const workspace = {
  id: 7,
  name: "Engineering",
  slug: "engineering",
  avatarUrl: null as string | null,
  hidden: false,
} satisfies Workspace;
// todo projects view -> with timeline, iterations, billing and paying status, etc

const meta = {
  component: DrawerContextEntityStrip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Strip shown at the top of entity drawer bodies (workspace, optional client, optional project). When `onOpenClientDetails` / `onOpenProjectDetails` are passed, those chips become clickable affordances.",
      },
    },
  },
} satisfies Meta<typeof DrawerContextEntityStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithClientClickable = {
  args: {
    services,
    workspace,
    client: demoClient,
    project: demoProject,
    onOpenClientDetails: () => {},
    onOpenProjectDetails: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-lg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Story;

export const WorkspaceOnly = {
  args: {
    services,
    workspace,
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-lg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Story;
