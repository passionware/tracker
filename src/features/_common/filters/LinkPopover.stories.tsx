import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { createExpressionService } from "@/services/front/ExpressionService/ExpressionService.impl.ts";
import { createClientService } from "@/services/io/ClientService/ClientService.mock.ts";
import { createContractorService } from "@/services/io/ContractorService/ContractorService.mock.ts";
import { createVariableService } from "@/services/io/VariableService/VariableService.mock.ts";
import { createWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.mock.ts";
import type { StoryObj } from "@storybook/react";

import { LinkPopover, LinkPopoverProps } from "./LinkPopover";

const meta = {
  component: LinkPopover,
  args: {
    services: {
      formatService: createFormatService(() => new Date()),
      expressionService: createExpressionService({
        services: {
          variableService: createVariableService(),
        },
      }),
      clientService: createClientService(),
      contractorService: createContractorService(),
      workspaceService: createWorkspaceService(),
    },
    initialValues: {
      source: 100,
      target: 427,
      description: "Przewalutowanie",
    },
    sourceCurrency: "PLN",
    targetCurrency: "EUR",
    title: "Link to report",
    sourceLabel: "Report amount",
    targetLabel: "Contributes to billing amount",
  },
  argTypes: {
    onValueChange: { action: "onValueChange" },
  },
} satisfies FixedMeta<typeof LinkPopover>;

export default meta;

type Story = StoryObj<LinkPopoverProps>;

export const Default = {} satisfies Story;
