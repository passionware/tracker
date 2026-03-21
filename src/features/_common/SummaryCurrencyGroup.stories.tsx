import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import type { CurrencyValueGroup } from "@/services/ExchangeService/ExchangeService.ts";
import { createFormatServiceForStory } from "@/services/FormatService/FormatService.mock.tsx";
import type { StoryObj } from "@storybook/react-vite";

import { Summary } from "./Summary.tsx";
import {
  SummaryCurrencyGroup,
  type SummaryCurrencyGroupProps,
} from "./SummaryCurrencyGroup.tsx";

const formatService = createFormatServiceForStory();

const singleSame: CurrencyValueGroup = {
  values: [{ amount: 1250.5, currency: "USD" }],
  approximatedJointValue: { amount: 1250.5, currency: "USD" },
};

/** Display currency differs from line currency — shows equivalent tooltip. */
const singleConverted: CurrencyValueGroup = {
  values: [{ amount: 100, currency: "EUR" }],
  approximatedJointValue: { amount: 108, currency: "USD" },
};

const multiple: CurrencyValueGroup = {
  values: [
    { amount: 2400, currency: "PLN" },
    { amount: 500, currency: "EUR" },
  ],
  approximatedJointValue: { amount: 1980, currency: "USD" },
};

type Args = SummaryCurrencyGroupProps;

const meta = {
  component: SummaryCurrencyGroup,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Renders a `SummaryEntry` filled from `CurrencyValueGroup`, including multi-currency tooltips and approximated joint values via `formatService`.",
      },
    },
  },
  args: {
    services: { formatService },
    group: singleSame,
    label: "Amount",
    description: "Formatted with workspace currency rules",
    variant: "card" as const,
  },
} satisfies FixedMeta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const SingleCurrency = {} satisfies Story;

export const WithConversionTooltip = {
  args: {
    group: singleConverted,
    label: "Client total",
    description: "Hover for USD equivalent",
  },
} satisfies Story;

export const MultiCurrency = {
  args: {
    group: multiple,
    label: "Mixed currencies",
    description: "Hover to see each value",
  },
} satisfies Story;

export const StripLayout = {
  render: (args) => (
    <Summary variant="strip" className="justify-end">
      <SummaryCurrencyGroup {...args} variant="strip" label="Total" />
      <SummaryCurrencyGroup
        {...args}
        variant="strip"
        label="Fees"
        group={{
          values: [{ amount: 42, currency: "USD" }],
          approximatedJointValue: { amount: 42, currency: "USD" },
        }}
      />
    </Summary>
  ),
  args: {
    group: singleSame,
    label: "Total",
    variant: "strip" as const,
  },
} satisfies Story;
