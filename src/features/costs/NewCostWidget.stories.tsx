import { costMock } from "@/api/cost/cost.mock.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import type { StoryObj } from "@storybook/react";

import { NewCostWidget, NewCostWidgetProps } from "./NewCostWidget";

const meta = {
  component: NewCostWidget,
  args: {
    services: {
      workspaceService: createWorkspaceService(),
      contractorService: createContractorService(),
    },
  },
} satisfies FixedMeta<NewCostWidgetProps>;

export default meta;

type Story = StoryObj<NewCostWidgetProps>;

export const Default = {} satisfies Story;
export const WithDefaultValues = {
  args: {
    defaultValues: costMock.static.list[0],
  },
} satisfies Story;
