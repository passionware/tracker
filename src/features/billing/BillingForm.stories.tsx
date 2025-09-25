import { billingMock } from "@/api/billing/billing.mock.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import type { StoryObj } from "@storybook/react-vite";

import { BillingForm, BillingFormProps } from "./BillingForm.tsx";

const meta = {
  component: BillingForm,
  args: {
    services: {
      workspaceService: createWorkspaceService(),
      clientService: createClientService(),
    },
  },
} satisfies FixedMeta<BillingFormProps>;

export default meta;

type Story = StoryObj<BillingFormProps>;

export const Default = {} satisfies Story;
export const WithDefaultValues = {
  args: {
    defaultValues: billingMock.static.list[0],
  },
} satisfies Story;
