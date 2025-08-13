import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NumberInput } from "./input";

const meta = {
  component: NumberInput,
  args: {
    value: 0,
  },
  argTypes: {
    onChange: { action: "onChange" },
    onFocus: { action: "onFocus" },
    onBlur: { action: "onBlur" },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState(args.value || 0);
    return <NumberInput {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof NumberInput>;

export default meta;

type Story = StoryObj<typeof NumberInput>;

export const Default = {} satisfies Story;

export const WithMinMax = {
  args: {
    minValue: 0,
    maxValue: 100,
    step: 5,
  },
} satisfies Story;

export const WithStep = {
  args: {
    step: 0.1,
  },
} satisfies Story;

export const Disabled = {
  args: {
    isDisabled: true,
    value: 42,
  },
} satisfies Story;

export const ReadOnly = {
  args: {
    isReadOnly: true,
    value: 42,
  },
} satisfies Story;

export const WithFormatting = {
  args: {
    formatOptions: {
      style: "currency",
      currency: "USD",
    },
  },
} satisfies Story;

export const WithPercentage = {
  args: {
    formatOptions: {
      style: "percent",
    },
    minValue: 0,
    maxValue: 100,
  },
} satisfies Story;

export const WithDecimals = {
  args: {
    formatOptions: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    step: 0.01,
  },
} satisfies Story;
