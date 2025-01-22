import { clientsMock } from "@/api/clients/clients.mock.ts";
import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import {
  InlineReportSearchView,
  InlineReportSearchViewProps,
} from "@/features/_common/inline-search/report/InlineReportSearchView.tsx";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import {
  ArgsWithServices,
  createSbServices,
} from "@/services/_common/createSbServices.ts";
import { expressionContextUtils } from "@/services/front/ExpressionService/ExpressionService.ts";
import { rd } from "@passionware/monads";
import type { StoryObj } from "@storybook/react";

const services = createSbServices({
  workspace: true,
  client: true,
  contractor: true,
});

type Args = ArgsWithServices<InlineReportSearchViewProps, typeof services>;

const meta = {
  decorators: [services.decorator.argsDecorator],
  component: InlineReportSearchView,
  args: {
    ...services.args,
    query: reportQueryUtils.setFilter(
      reportQueryUtils.ofDefault(0, 0),
      "contractorId",
      { operator: "oneOf", value: [contractorMock.static.list[0].id] },
    ),
    data: rd.of([
      {
        id: 1,
        description: "Description",
        contractor: contractorMock.static.list[0],
        workspace: workspaceMock.static.list[0],
        client: clientsMock.static.list[0],
        netAmount: { amount: 100, currency: "USD" },
      },
      {
        id: 2,
        description: "Description",
        contractor: contractorMock.static.list[0],
        workspace: workspaceMock.static.list[0],
        client: clientsMock.static.list[0],
        netAmount: { amount: 200, currency: "USD" },
      },
      {
        id: 3,
        description: "Description",
        contractor: contractorMock.static.list[0],
        workspace: workspaceMock.static.list[1],
        client: clientsMock.static.list[1],
        netAmount: { amount: 300, currency: "USD" },
      },
    ]),
    context: expressionContextUtils.ofGlobal().build(),
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
    context: expressionContextUtils
      .ofGlobal()
      .setWorkspace(workspaceMock.static.list[0].id)
      .build(),
  },
} satisfies Story;

export const ScopedToClient = {
  args: {
    ...meta.args,
    context: expressionContextUtils
      .ofGlobal()
      .setClient(clientsMock.static.list[0].id)
      .build(),
  },
} satisfies Story;

export const ScopedToContractor = {
  args: {
    ...meta.args,
    context: expressionContextUtils
      .ofGlobal()
      .setContractor(contractorMock.static.list[0].id)
      .build(),
  },
} satisfies Story;

export const ScopedToWorkspaceAndClient = {
  args: {
    ...meta.args,
    context: expressionContextUtils
      .ofGlobal()
      .setWorkspace(workspaceMock.static.list[0].id)
      .setClient(clientsMock.static.list[0].id)
      .build(),
  },
} satisfies Story;
