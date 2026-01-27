import { clientsMock } from "@/api/clients/clients.mock.ts";
import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { reportQueryUtils, Report } from "@/api/reports/reports.api.ts";
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
import { CalendarDate } from "@internationalized/date";
import { rd } from "@passionware/monads";
import type { StoryObj } from "@storybook/react-vite";

const services = createSbServices({
  workspace: true,
  client: true,
  contractor: true,
  format: true,
  expression: true,
  variable: true,
});

type Args = ArgsWithServices<ReportListProps, typeof services>;

const meta = {
  decorators: [services.decorator.argsDecorator],
  component: ReportList,
  args: {
    showBillingColumns: true,
    showCostColumns: true,
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
        remainingAmount: { amount: 50, currency: "USD" },
        status: "partially-billed",
        billedAmount: { amount: 50, currency: "USD" },
        originalReport: {
          id: 1,
          createdAt: "2024-01-01",
          isCommitted: false,
          contractorId: contractorMock.static.list[0].id,
          clientId: clientsMock.static.list[0].id,
          workspaceId: workspaceMock.static.list[0].id,
          periodStart: new CalendarDate(2024, 1, 1),
          periodEnd: new CalendarDate(2024, 1, 31),
          description: "Description",
          netValue: 100,
          currency: "USD",
          projectIterationId: null,
          contractor: contractorMock.static.list[0],
          client: clientsMock.static.list[0],
          linkBillingReport: [],
          linkCostReport: [],
          reportBillingValue: 50,
          reportBillingBalance: 50,
          reportCostValue: 0,
          reportCostBalance: 100,
          billingCostBalance: 50,
          immediatePaymentDue: 50,
          previousReport: null,
        } as Report,
      },
      {
        id: 2,
        description: "Description",
        contractor: contractorMock.static.list[0],
        workspace: workspaceMock.static.list[0],
        client: clientsMock.static.list[0],
        netAmount: { amount: 200, currency: "USD" },
        remainingAmount: { amount: 100, currency: "USD" },
        status: "partially-billed",
        billedAmount: { amount: 50, currency: "USD" },
        originalReport: {
          id: 2,
          createdAt: "2024-01-01",
          isCommitted: false,
          contractorId: contractorMock.static.list[0].id,
          clientId: clientsMock.static.list[0].id,
          workspaceId: workspaceMock.static.list[0].id,
          periodStart: new CalendarDate(2024, 1, 1),
          periodEnd: new CalendarDate(2024, 1, 31),
          description: "Description",
          netValue: 200,
          currency: "USD",
          projectIterationId: null,
          contractor: contractorMock.static.list[0],
          client: clientsMock.static.list[0],
          linkBillingReport: [],
          linkCostReport: [],
          reportBillingValue: 50,
          reportBillingBalance: 150,
          reportCostValue: 0,
          reportCostBalance: 200,
          billingCostBalance: 50,
          immediatePaymentDue: 50,
          previousReport: null,
        } as Report,
      },
      {
        id: 3,
        description: "Description",
        contractor: contractorMock.static.list[0],
        workspace: workspaceMock.static.list[1],
        client: clientsMock.static.list[1],
        netAmount: { amount: 300, currency: "USD" },
        remainingAmount: { amount: 150, currency: "USD" },
        status: "partially-billed",
        billedAmount: { amount: 50, currency: "USD" },
        originalReport: {
          id: 3,
          createdAt: "2024-01-01",
          isCommitted: false,
          contractorId: contractorMock.static.list[0].id,
          clientId: clientsMock.static.list[1].id,
          workspaceId: workspaceMock.static.list[1].id,
          periodStart: new CalendarDate(2024, 1, 1),
          periodEnd: new CalendarDate(2024, 1, 31),
          description: "Description",
          netValue: 300,
          currency: "USD",
          projectIterationId: null,
          contractor: contractorMock.static.list[0],
          client: clientsMock.static.list[1],
          linkBillingReport: [],
          linkCostReport: [],
          reportBillingValue: 50,
          reportBillingBalance: 250,
          reportCostValue: 0,
          reportCostBalance: 300,
          billingCostBalance: 50,
          immediatePaymentDue: 50,
          previousReport: null,
        } as Report,
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
