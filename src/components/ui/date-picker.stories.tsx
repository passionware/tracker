import { CalendarDate } from "@internationalized/date";
import { maybe, Maybe } from "@passionware/monads";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./date-picker.tsx";

const meta = {
  component: DatePicker,
  args: {
    value: maybe.ofAbsent(),
    placeholder: "Pick a date",
  },
  argTypes: {
    onChange: { action: "onChange" },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<Maybe<CalendarDate>>(args.value);

    return <DatePicker {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof DatePicker>;

export const Default = {} satisfies Story;

export const WithValue = {
  args: {
    value: maybe.of(new CalendarDate(2024, 1, 15)),
  },
} satisfies Story;

export const Disabled = {
  args: {
    disabled: true,
  },
} satisfies Story;

export const CustomPlaceholder = {
  args: {
    placeholder: "Choose your preferred date",
  },
} satisfies Story;

export const AllVariants = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value1, setValue1] = useState<Maybe<CalendarDate>>(maybe.ofAbsent());
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value2, setValue2] = useState<Maybe<CalendarDate>>(
      maybe.of(new CalendarDate(2024, 1, 15)),
    );
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value3, setValue3] = useState<Maybe<CalendarDate>>(maybe.ofAbsent());

    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Default State</h3>
          <DatePicker
            value={value1}
            onChange={setValue1}
            placeholder="Pick a date"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">With Pre-selected Value</h3>
          <DatePicker
            value={value2}
            onChange={setValue2}
            placeholder="Pick a date"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Disabled State</h3>
          <DatePicker
            value={value3}
            onChange={setValue3}
            placeholder="Pick a date"
            disabled={true}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Custom Placeholder</h3>
          <DatePicker
            value={maybe.ofAbsent()}
            onChange={() => {}}
            placeholder="Custom placeholder text"
          />
        </div>
      </div>
    );
  },
} satisfies Story;
