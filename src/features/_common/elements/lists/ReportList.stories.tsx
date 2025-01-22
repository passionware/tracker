import { clientsMock } from "@/api/clients/clients.mock.ts";
import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import {
  ReportList,
  ReportListProps,
} from "@/features/_common/elements/lists/ReportList.tsx";
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

type Args = ArgsWithServices<ReportListProps, typeof services>;

const meta = {
  decorators: [services.decorator.argsDecorator],
  component: ReportList,
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
