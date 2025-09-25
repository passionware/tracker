import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createSbServices } from "@/services/_common/createSbServices.ts";
import type { StoryObj } from "@storybook/react-vite";

import { LinkPopover, LinkPopoverProps } from "./LinkPopover";

const sbServices = createSbServices({
  client: true,
  contractor: true,
  workspace: true,
  variable: true,
  format: true,
  expression: true,
});

const meta = {
  decorators: [sbServices.decorator.argsDecorator],
  component: LinkPopover,
  args: {
    ...sbServices.args,
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
