import type { Meta, StoryObj } from "@storybook/react-vite";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import { DevDatabaseBannerView } from "./SidebarDevDatabaseBanner.tsx";

const meta = {
  component: DevDatabaseBannerView,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DevDatabaseBannerView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded = {
  args: {
    collapsed: false,
    lines: [
      { label: "Main app", schema: "dev" },
      { label: "Cockpit", schema: "client_cockpit_dev" },
    ],
  },
  render: (args) => (
    <div className="w-56">
      <DevDatabaseBannerView {...args} />
    </div>
  ),
} satisfies Story;

export const Collapsed = {
  args: {
    collapsed: true,
    lines: [
      { label: "Main app", schema: "dev" },
      { label: "Cockpit", schema: "client_cockpit_dev" },
    ],
  },
  render: (args) => (
    <div className="flex w-12 justify-center">
      <DevDatabaseBannerView {...args} />
    </div>
  ),
} satisfies Story;
