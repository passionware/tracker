import { Badge } from "@/components/ui/badge.tsx";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  DrawerHeaderHero,
  DrawerHeaderHeroMetaItem,
  DrawerHeaderHeroSkeleton,
} from "./DrawerHeaderHero.tsx";

const meta = {
  component: DrawerHeaderHero,
  decorators: [
    (Story) => (
      <div className="max-w-xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DrawerHeaderHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    fallbackInitials: "AC",
    title: "Acme Consulting",
    meta: (
      <>
        <DrawerHeaderHeroMetaItem
          label="Client ID"
          value="42"
          valueClassName="tabular-nums"
        />
        <DrawerHeaderHeroMetaItem
          label="Bank sender"
          value="ACME PAYROLL"
          className="sm:max-w-[min(100%,22rem)]"
          valueClassName="[overflow-wrap:anywhere]"
        />
        <DrawerHeaderHeroMetaItem label="Visibility" value="Visible" />
      </>
    ),
  },
};

export const WithHiddenBadge: Story = {
  args: {
    fallbackInitials: "PI",
    title: "Passionware",
    titleAdornment: (
      <Badge
        tone="secondary"
        variant="neutral"
        size="sm"
        className="shrink-0 font-medium"
      >
        Hidden
      </Badge>
    ),
    meta: (
      <>
        <DrawerHeaderHeroMetaItem
          label="Workspace ID"
          value="6"
          valueClassName="tabular-nums"
        />
        <DrawerHeaderHeroMetaItem
          label="Slug"
          value="passionware"
          className="sm:max-w-[min(100%,22rem)]"
          valueClassName="font-mono [overflow-wrap:anywhere]"
        />
        <DrawerHeaderHeroMetaItem label="Visibility" value="Hidden" />
      </>
    ),
  },
};

/** Renders `DrawerHeaderHeroSkeleton` (loading placeholder). */
export const SkeletonState: StoryObj = {
  decorators: meta.decorators,
  render: () => <DrawerHeaderHeroSkeleton />,
};
