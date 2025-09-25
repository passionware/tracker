import { parseDate } from "@/platform/lang/parseDate.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import { maybe } from "@passionware/monads";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DateFilterWidget } from "./DateFilterWidget.tsx";

const meta = {
  component: DateFilterWidget,
  args: {
    value: maybe.ofAbsent(),
    fieldLabel: "Some field",
    services: { formatService: createFormatService(() => new Date()) },
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState(args.value);

    return <DateFilterWidget {...args} value={value} onUpdate={setValue} />;
  },
} satisfies Meta<typeof DateFilterWidget>;

export default meta;

type Story = StoryObj<typeof DateFilterWidget>;

export const Default = {} satisfies Story;

export const WithEqual = {
  args: {
    value: {
      operator: "equal",
      value: parseDate("2022-01-01"),
    },
  },
} satisfies Story;

export const WithGreaterThan = {
  args: {
    value: {
      operator: "greaterThan",
      value: parseDate("2022-01-01"),
    },
  },
} satisfies Story;

export const WithLessThan = {
  args: {
    value: {
      operator: "lessThan",
      value: parseDate("2022-01-01"),
    },
  },
} satisfies Story;

export const WithBetween = {
  args: {
    value: {
      operator: "between",
      value: {
        from: parseDate("2022-01-01"),
        to: parseDate("2022-01-09"),
      },
    },
  },
} satisfies Story;
