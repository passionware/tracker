import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  PointerFollowTooltip,
  PointerFollowTooltipProvider,
} from "./pointer-follow-tooltip.tsx";

const meta = {
  component: PointerFollowTooltip,
  decorators: [
    (Story) => (
      <PointerFollowTooltipProvider>
        <Story />
      </PointerFollowTooltipProvider>
    ),
  ],
} satisfies Meta<typeof PointerFollowTooltip>;

export default meta;

type Story = StoryObj<typeof PointerFollowTooltip>;

export const WideTriggerFollowsPointer = {
  render: () => (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <PointerFollowTooltip
        delayDuration={200}
        light
        contentClassName="max-w-xs p-3 shadow-md"
        content={
          <p className="text-sm">
            Tooltip stays near the cursor while you move along this wide bar,
            instead of snapping to the bar&apos;s screen edges.
          </p>
        }
      >
        <div className="h-10 w-[min(90vw,640px)] cursor-crosshair rounded-md bg-primary/25" />
      </PointerFollowTooltip>
    </div>
  ),
} satisfies Story;
