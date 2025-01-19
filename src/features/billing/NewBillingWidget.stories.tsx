import { billingMock } from "@/api/billing/billing.mock.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import type { StoryObj } from "@storybook/react";

import {
  NewBillingWidget,
  NewBillingWidgetProps,
} from "./NewBillingWidget.tsx";

const meta = {
  component: NewBillingWidget,
  args: {
    services: {
      workspaceService: createWorkspaceService(),
      clientService: createClientService(),
    },
  },
} satisfies FixedMeta<NewBillingWidgetProps>;

export default meta;

type Story = StoryObj<NewBillingWidgetProps>;

export const Default = {} satisfies Story;
export const WithDefaultValues = {
  args: {
    defaultValues: billingMock.static.list[0],
  },
} satisfies Story;
