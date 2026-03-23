import type { Meta, StoryObj } from "@storybook/react-vite";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import type { TimelineItem } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { useState } from "react";
import {
  TimelineMilestoneDiamond,
  type TimelineMilestoneDiamondProps,
} from "./TimelineMilestoneDiamond.tsx";

const tz = getLocalTimeZone();
const t0 = fromAbsolute(new Date(2025, 5, 15, 12, 0, 0, 0).getTime(), tz);

const meta = {
  component: TimelineMilestoneDiamond,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Fixed-size diamond for instant timeline markers (billing, cost, etc.); center stays aligned to the time axis while zoom changes.",
      },
    },
  },
} satisfies Meta<typeof TimelineMilestoneDiamond>;

export default meta;

type Story = StoryObj<typeof meta>;

const noopMouseDown: TimelineMilestoneDiamondProps["onMouseDown"] = () => {};
const noop = () => {};

const itemViolet = {
  id: "m1",
  laneId: "l",
  start: t0,
  end: t0,
  label: "INV-1042 · Acme Ltd",
  color: "bg-violet-500",
  data: {},
} satisfies TimelineItem<Record<string, never>>;

const itemOrange = {
  id: "m2",
  laneId: "l",
  start: t0,
  end: t0,
  label: "Cost #88",
  color: "bg-orange-500",
  data: {},
} satisfies TimelineItem<Record<string, never>>;

export const Violet: Story = {
  args: {
    item: itemViolet,
    left: 120,
    isSelected: false,
    selected: false,
    isHovered: false,
    onMouseDown: noopMouseDown,
    onMouseEnter: noop,
    onMouseLeave: noop,
  },
  render: function VioletStory(args) {
    const [hover, setHover] = useState(false);
    return (
      <div className="relative h-16 w-48 rounded-md border bg-timeline-lane">
        <TimelineMilestoneDiamond
          {...args}
          isHovered={hover}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        />
      </div>
    );
  },
};

export const OrangeSelected: Story = {
  args: {
    item: itemOrange,
    left: 80,
    isSelected: true,
    selected: true,
    isHovered: false,
    onMouseDown: noopMouseDown,
    onMouseEnter: noop,
    onMouseLeave: noop,
  },
  render: (args) => (
    <div className="relative h-16 w-48 rounded-md border bg-timeline-lane-alt">
      <TimelineMilestoneDiamond {...args} />
    </div>
  ),
};

const itemUnpaidBilling = {
  ...itemViolet,
  id: "m-unpaid",
  label: "INV-2201 · unpaid",
  color: "bg-chart-2",
} satisfies TimelineItem<Record<string, never>>;

export const BillingWithIterationPeriod: Story = {
  args: {
    item: itemUnpaidBilling,
    left: 118,
    variant: "billing-unpaid",
    laneHighlight: {
      bandLeft: 28,
      bandWidth: 96,
      trackHeightPx: 64,
    },
    isSelected: false,
    selected: false,
    isHovered: false,
    onMouseDown: noopMouseDown,
    onMouseEnter: noop,
    onMouseLeave: noop,
  },
  render: function BillingWithIterationPeriodStory(args) {
    const [hover, setHover] = useState(false);
    return (
      <div className="relative h-16 w-48 rounded-md border bg-timeline-lane">
        <TimelineMilestoneDiamond
          {...args}
          isHovered={hover}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        />
      </div>
    );
  },
};

export const BillingUnpaid: Story = {
  args: {
    item: itemUnpaidBilling,
    left: 120,
    variant: "billing-unpaid",
    isSelected: false,
    selected: false,
    isHovered: false,
    onMouseDown: noopMouseDown,
    onMouseEnter: noop,
    onMouseLeave: noop,
  },
  render: function BillingUnpaidStory(args) {
    const [hover, setHover] = useState(false);
    return (
      <div className="relative h-16 w-48 rounded-md border bg-timeline-lane">
        <TimelineMilestoneDiamond
          {...args}
          isHovered={hover}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        />
      </div>
    );
  },
};
