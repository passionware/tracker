import { clientBillingMock } from "@/api/client-billing/client-billing.mock.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import type { StoryObj } from "@storybook/react";

import {
  NewClientBillingWidget,
  NewClientBillingWidgetProps,
} from "./NewClientBillingWidget";

const meta = {
  component: NewClientBillingWidget,
  args: {
    services: {
      workspaceService: createWorkspaceService(),
      clientService: createClientService(),
    },
  },
} satisfies FixedMeta<NewClientBillingWidgetProps>;

export default meta;

type Story = StoryObj<NewClientBillingWidgetProps>;

export const Default = {} satisfies Story;
export const WithDefaultValues = {
  args: {
    defaultValues: clientBillingMock.static.list[0],
  },
} satisfies Story;
