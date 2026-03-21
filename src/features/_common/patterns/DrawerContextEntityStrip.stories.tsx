import type { Client } from "@/api/clients/clients.api.ts";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createClientServiceForEntityStripStory } from "@/services/io/ClientService/ClientService.mock.ts";

import { DrawerContextEntityStrip } from "./DrawerContextEntityStrip.tsx";

const demoClient = {
  id: 42,
  name: "Northwind LLC",
  avatarUrl: null as string | null,
  senderName: "NORTHWIND PAY" as string | null,
  hidden: false,
} satisfies Client;

const services = {
  clientService: createClientServiceForEntityStripStory(demoClient.id, demoClient),
};

const workspace = {
  id: 7,
  name: "Engineering",
  slug: "engineering",
  avatarUrl: null as string | null,
};

const meta = {
  component: DrawerContextEntityStrip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Strip shown at the top of report / billing / cost drawer bodies. Client chip is optional; when `onOpenClientDetails` is passed it becomes a nested-drawer affordance.",
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
    onOpenClientDetails: () => {},
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
