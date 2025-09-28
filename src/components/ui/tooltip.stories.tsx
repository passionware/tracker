import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import {
  SimpleTooltip,
  SimpleTooltipProps,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  component: SimpleTooltip,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof SimpleTooltip>;

export default meta;

type Story = StoryObj<Partial<SimpleTooltipProps>>;

export const Default = {
  render: (props) => (
    <SimpleTooltip {...props} title="This is a tooltip">
      <Button>Hover me</Button>
    </SimpleTooltip>
  ),
} satisfies Story;

export const Positions = {
  render: (props) => (
    <div className="flex flex-wrap gap-4 p-8">
      <SimpleTooltip {...props} title="Top tooltip">
        <Button>Top</Button>
      </SimpleTooltip>
      <SimpleTooltip {...props} title="Right tooltip">
        <Button>Right</Button>
      </SimpleTooltip>
      <SimpleTooltip {...props} title="Bottom tooltip">
        <Button>Bottom</Button>
      </SimpleTooltip>
      <SimpleTooltip {...props} title="Left tooltip">
        <Button>Left</Button>
      </SimpleTooltip>
    </div>
  ),
} satisfies Story;

export const Light = {
  render: (props) => (
    <div className="flex gap-4 p-4">
      <SimpleTooltip title="Dark tooltip" {...props}>
        <Button>Dark</Button>
      </SimpleTooltip>
      <SimpleTooltip title="Light tooltip" light {...props}>
        <Button>Light</Button>
      </SimpleTooltip>
    </div>
  ),
} satisfies Story;

export const LongContent = {
  render: (props) => (
    <SimpleTooltip
      {...props}
      title="This is a very long tooltip that contains a lot of text and should wrap to multiple lines to demonstrate how the tooltip handles longer content."
    >
      <Button>Long tooltip</Button>
    </SimpleTooltip>
  ),
} satisfies Story;

export const WithIcons = {
  render: (props) => (
    <div className="flex gap-4 p-4">
      <SimpleTooltip title="Download file" {...props}>
        <Button size="icon">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m-3-3v6"
            />
          </svg>
        </Button>
      </SimpleTooltip>
      <SimpleTooltip title="Settings">
        <Button size="icon">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Button>
      </SimpleTooltip>
      <SimpleTooltip title="Delete item">
        <Button size="icon" variant="destructive">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </Button>
      </SimpleTooltip>
    </div>
  ),
} satisfies Story;

export const CustomDelay = {
  render: (props) => (
    <div className="flex gap-4 p-4">
      <SimpleTooltip title="Fast tooltip" delayDuration={100} {...props}>
        <Button>Fast (100ms)</Button>
      </SimpleTooltip>
      <SimpleTooltip title="Default tooltip" {...props}>
        <Button>Default (1000ms)</Button>
      </SimpleTooltip>
      <SimpleTooltip title="Slow tooltip" delayDuration={2000} {...props}>
        <Button>Slow (2000ms)</Button>
      </SimpleTooltip>
    </div>
  ),
} satisfies Story;

export const Disabled = {
  render: (props) => (
    <div className="flex gap-4 p-4">
      <SimpleTooltip title="This tooltip is enabled" {...props}>
        <Button>Enabled</Button>
      </SimpleTooltip>
      <SimpleTooltip title="This tooltip is disabled" open={false} {...props}>
        <Button>Disabled</Button>
      </SimpleTooltip>
    </div>
  ),
} satisfies Story;

export const ManualControl = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Manual control</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This tooltip can be controlled manually</p>
      </TooltipContent>
    </Tooltip>
  ),
} satisfies Story;
