import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  fromAbsolute,
  getLocalTimeZone,
  type ZonedDateTime,
} from "@internationalized/date";
import { useState } from "react";
import {
  InfiniteTimeline,
  InfiniteTimelineWithState,
  type TimelineItem,
} from "./passionware-timeline.tsx";
import type { Lane } from "./timeline-lane-tree.ts";
import { useTimelineCore } from "./use-timeline-core.ts";

const timeZone = getLocalTimeZone();

function at(dayOffset: number, hour: number, minute = 0): ZonedDateTime {
  const d = new Date(2025, 2, 10 + dayOffset, hour, minute, 0, 0);
  return fromAbsolute(d.getTime(), timeZone);
}

const meta = {
  component: InfiniteTimelineWithState,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Use `InfiniteTimelineWithState` for convenience, or `useTimelineCore` (state only) + `InfiniteTimeline` (layout + interactions inside the component). Pass callbacks via `interactionOptions`. Nest `children` on `Lane` for sublanes. Default `itemActivateTrigger` is `mousedown` (pairs with table row focus); use `click` when items use hover tooltips or open drawers on activation.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[min(720px,90vh)] w-full min-w-[640px] bg-background p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InfiniteTimelineWithState>;

export default meta;

type Story = StoryObj<typeof meta>;

const flatLanes: Lane[] = [
  { id: "a", name: "Track A", color: "bg-chart-1" },
  { id: "b", name: "Track B", color: "bg-chart-2" },
];

const flatItems: TimelineItem<{ note?: string }>[] = [
  {
    id: "e1",
    laneId: "a",
    start: at(0, 9),
    end: at(0, 12),
    label: "Morning block",
    color: "bg-chart-1",
    data: {},
  },
  {
    id: "e2",
    laneId: "a",
    start: at(0, 14),
    end: at(1, 10),
    label: "Spans midnight",
    color: "bg-chart-3",
    data: {},
  },
  {
    id: "e3",
    laneId: "b",
    start: at(0, 11),
    end: at(0, 16),
    label: "Track B work",
    color: "bg-chart-2",
    data: {},
  },
];

export const FlatLanes: Story = {
  args: {
    lanes: flatLanes,
    items: flatItems,
  },
};

const iterationLanes: Lane[] = [
  {
    id: "iter-1",
    name: "Iteration 1",
    color: "bg-chart-1",
    children: [
      {
        id: "iter-1-reports",
        name: "Reports",
        color: "bg-muted-foreground/30",
        children: [
          {
            id: "iter-1-r1",
            name: "Report Mar 10",
            color: "bg-chart-2",
          },
          {
            id: "iter-1-r2",
            name: "Report Mar 11",
            color: "bg-chart-2",
          },
        ],
      },
      {
        id: "iter-1-billings",
        name: "Billings",
        color: "bg-chart-4",
        children: [
          {
            id: "iter-1-b1",
            name: "INV-1001",
            color: "bg-chart-4",
          },
        ],
      },
      {
        id: "iter-1-costs",
        name: "Costs",
        color: "bg-chart-5",
        children: [
          {
            id: "iter-1-c1",
            name: "Contractor hours",
            color: "bg-chart-5",
          },
        ],
      },
    ],
  },
  {
    id: "iter-2",
    name: "Iteration 2",
    color: "bg-chart-3",
    children: [
      {
        id: "iter-2-reports",
        name: "Reports",
        color: "bg-muted-foreground/30",
        children: [
          { id: "iter-2-r1", name: "Report Mar 14", color: "bg-chart-2" },
        ],
      },
    ],
  },
];

const iterationItems: TimelineItem[] = [
  {
    id: "i1",
    laneId: "iter-1",
    start: at(0, 8),
    end: at(2, 18),
    label: "Iteration 1",
    color: "bg-chart-1",
    data: {},
  },
  {
    id: "r1",
    laneId: "iter-1-r1",
    start: at(0, 10),
    end: at(0, 15),
    label: "RPT-01",
    color: "bg-chart-2",
    data: {},
  },
  {
    id: "r2",
    laneId: "iter-1-r2",
    start: at(1, 9),
    end: at(1, 12),
    label: "RPT-02",
    color: "bg-chart-2",
    data: {},
  },
  {
    id: "b1",
    laneId: "iter-1-b1",
    start: at(1, 14),
    end: at(1, 16),
    label: "Billed",
    color: "bg-chart-4",
    data: {},
  },
  {
    id: "c1",
    laneId: "iter-1-c1",
    start: at(0, 16),
    end: at(1, 11),
    label: "Cost window",
    color: "bg-chart-5",
    data: {},
  },
  {
    id: "i2",
    laneId: "iter-2",
    start: at(3, 8),
    end: at(5, 17),
    label: "Iteration 2",
    color: "bg-chart-3",
    data: {},
  },
  {
    id: "r2a",
    laneId: "iter-2-r1",
    start: at(4, 10),
    end: at(4, 14),
    label: "RPT-10",
    color: "bg-chart-2",
    data: {},
  },
];

export const RecursiveLaneTree: Story = {
  args: {
    lanes: iterationLanes,
    items: iterationItems,
    defaultExpandedLaneIds: ["iter-1"],
  },
};

function ControlledExpansionDemo() {
  const [ids, setIds] = useState<Set<string>>(() => new Set(["iter-1"]));
  const state = useTimelineCore({
    lanes: iterationLanes,
    items: iterationItems,
    expandedLaneIds: ids,
    onExpandedLaneIdsChange: (next) => setIds(new Set(next)),
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex gap-2 text-xs text-muted-foreground shrink-0">
        <button
          type="button"
          className="underline"
          onClick={() => setIds(new Set(["iter-1", "iter-1-reports"]))}
        >
          Expand iter-1 + reports
        </button>
        <button
          type="button"
          className="underline"
          onClick={() => setIds(new Set())}
        >
          Collapse all
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <InfiniteTimeline state={state} />
      </div>
    </div>
  );
}

export const ControlledExpansion: Story = {
  args: { items: iterationItems, lanes: iterationLanes },
  render: () => <ControlledExpansionDemo />,
};

function ExpansionViaHookDefaultsDemo() {
  const state = useTimelineCore({
    lanes: iterationLanes,
    items: iterationItems,
    defaultExpandedLaneIds: ["iter-1", "iter-1-reports"],
  });
  return <InfiniteTimeline state={state} />;
}

export const ExpansionViaHookDefaults: Story = {
  args: { items: iterationItems, lanes: iterationLanes },
  render: () => <ExpansionViaHookDefaultsDemo />,
};
