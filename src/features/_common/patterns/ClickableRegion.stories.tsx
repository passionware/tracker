import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@/components/ui/badge.tsx";

import { ClickableRegion } from "./ClickableRegion.tsx";

const meta = {
  component: ClickableRegion,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Accessible div-based control for activating an action when children are not phrasing-only (e.g. layout with avatars). Prefer real `<button>` when markup allows.",
      },
    },
  },
} satisfies Meta<typeof ClickableRegion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithBadgeChildren = {
  args: {
    "aria-label": "Open Acme Corp details",
    onActivate: () => {},
    children: (
      <span className="flex items-center gap-2">
        <Badge variant="secondary">Client</Badge>
        <span className="text-sm font-medium">Acme Corp</span>
      </span>
    ),
  },
} satisfies Story;
