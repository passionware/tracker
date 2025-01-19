import { costMock } from "@/api/cost/cost.mock.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import type { StoryObj } from "@storybook/react";

import { CostForm, CostFormProps } from "./CostForm.tsx";

const meta = {
  component: CostForm,
  args: {
    services: {
      workspaceService: createWorkspaceService(),
      contractorService: createContractorService(),
    },
  },
} satisfies FixedMeta<CostFormProps>;

export default meta;

type Story = StoryObj<CostFormProps>;

export const Default = {} satisfies Story;
export const WithDefaultValues = {
  args: {
    defaultValues: costMock.static.list[0],
  },
} satisfies Story;
