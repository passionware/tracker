import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Banknote,
  FileSpreadsheet,
  Sparkles,
  Wallet,
} from "lucide-react";

import { IconTile } from "./IconTile.tsx";

const meta = {
  component: IconTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Fixed 40×40 icon container with accent or muted styling. Child should be a Lucide (or similar) icon; size is normalized via `[&_svg]`.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["accent", "muted"],
    },
  },
} satisfies Meta<typeof IconTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Accent = {
  args: {
    variant: "accent",
    children: <Sparkles />,
  },
} satisfies Story;

export const Muted = {
  args: {
    variant: "muted",
    children: <Wallet />,
  },
} satisfies Story;

export const Comparison = {
  args: {
    children: <Sparkles />,
    variant: "accent" as const,
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <IconTile variant="accent">
          <Banknote />
        </IconTile>
        <span className="text-xs text-muted-foreground">accent</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconTile variant="muted">
          <FileSpreadsheet />
        </IconTile>
        <span className="text-xs text-muted-foreground">muted</span>
      </div>
    </div>
  ),
} satisfies Story;

export const InListRow = {
  args: {
    children: <Banknote />,
    variant: "accent" as const,
  },
  render: () => (
    <ul className="w-full max-w-sm divide-y rounded-xl border border-border bg-card">
      {[
        { icon: <Banknote />, label: "Invoices", hint: "3 open" },
        { icon: <Wallet />, label: "Payments", hint: "Synced" },
        { icon: <Sparkles />, label: "AI match", hint: "Beta" },
      ].map((row) => (
        <li
          key={row.label}
          className="flex items-center gap-3 px-4 py-3 text-sm"
        >
          <IconTile variant="accent">{row.icon}</IconTile>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground">{row.label}</div>
            <div className="text-xs text-muted-foreground">{row.hint}</div>
          </div>
        </li>
      ))}
    </ul>
  ),
} satisfies Story;
