import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import {
  ReportQueryBar,
  ReportQueryBarProps,
} from "@/features/_common/elements/query/ReportQueryBar.tsx";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import {
  ArgsWithServices,
  createSbServices,
} from "@/services/_common/createSbServices.ts";
import { classNameDecorator } from "@passionware/platform-storybook";
import type { StoryObj } from "@storybook/react-vite";

const services = createSbServices({
  workspace: true,
  client: true,
  contractor: true,
  format: true,
});

type Args = ArgsWithServices<ReportQueryBarProps, typeof services>;

const meta = {
  decorators: [
    services.decorator.argsDecorator,
    classNameDecorator("flex flex-row gap-2"),
  ],
  component: ReportQueryBar,
  args: {
    ...services.args,
    query: reportQueryUtils.setFilter(
      reportQueryUtils.ofDefault(0, 0),
      "contractorId",
      { operator: "oneOf", value: [contractorMock.static.list[0].id] },
    ),
    spec: {
      workspace: "show",
      client: "show",
      contractor: "show",
    },
  },
  argTypes: {
    ...services.argTypes,
    onQueryChange: {
      action: "onQueryChange",
    },
  },
} satisfies FixedMeta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const Default = {} satisfies Story;

export const ScopedToWorkspace = {
  args: {
    ...meta.args,
    spec: {
      workspace: "show",
      client: "disable",
      contractor: "show",
    },
  },
} satisfies Story;

export const ScopedToClient = {
  args: {
    ...meta.args,
    spec: {
      workspace: "disable",
      client: "show",
      contractor: "disable",
    },
  },
} satisfies Story;

export const ScopedToContractor = {
  args: {
    ...meta.args,
    spec: {
      workspace: "disable",
      client: "disable",
      contractor: "show",
    },
  },
} satisfies Story;

export const ScopedToWorkspaceAndClient = {
  args: {
    ...meta.args,
    spec: {
      workspace: "show",
      client: "show",
      contractor: "disable",
    },
  },
} satisfies Story;

export const ScopedToWorkspaceAndContractorAndClient = {
  args: {
    ...meta.args,
    spec: {
      workspace: "show",
      client: "show",
      contractor: "show",
    },
  },
};
