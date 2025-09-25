import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { billingMock } from "@/api/billing/billing.mock.ts";
import { clientsMock } from "@/api/clients/clients.mock.ts";
import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import {
  BillingList,
  BillingListProps,
} from "@/features/_common/elements/lists/BillingList.tsx";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import {
  ArgsWithServices,
  createSbServices,
} from "@/services/_common/createSbServices.ts";
import { createExchangeService } from "@/services/ExchangeService/ExchangeService.mock.ts";
import { expressionContextUtils } from "@/services/front/ExpressionService/ExpressionService.ts";
import { calculateBilling } from "@/services/front/ReportDisplayService/_private/billing.ts";
import { createReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.impl.ts";
import { createBillingService } from "@/services/io/BillingService/BillingService.mock.ts";
import { createCostService } from "@/services/io/CostService/CostService.mock.ts";
import { createReportService } from "@/services/io/ReportService/ReportService.mock.ts";
import { rd } from "@passionware/monads";
import type { StoryObj } from "@storybook/react-vite";

const services = createSbServices({
  workspace: true,
  client: true,
  contractor: true,
  format: true,
  expression: true,
  variable: true,
  preference: true,
});

type Args = ArgsWithServices<BillingListProps, typeof services>;

const meta = {
  decorators: [services.decorator.argsDecorator],
  component: BillingList,
  args: {
    ...{
      ...services.args,
      services: {
        ...services.args.services,
        reportDisplayService: createReportDisplayService({
          services: {
            workspaceService: services.args.services.workspaceService,
            exchangeService: createExchangeService(),
            reportService: createReportService(),
            costService: createCostService(),
            billingService: createBillingService(),
          },
        }),
      },
    },
    query: billingQueryUtils.setFilter(
      billingQueryUtils.ofDefault(0, 0),
      "contractorId",
      { operator: "oneOf", value: [contractorMock.static.list[0].id] },
    ),
    data: rd.of(
      billingMock.static.list.map((x) =>
        calculateBilling(
          {
            ...x,
            billingReportValue: 0,
            totalBillingValue: 0,
            billingBalance: 0,
            remainingBalance: 0,
            client: clientsMock.static.list[0],
            linkBillingReport: [],
            contractors: [],
          },
          workspaceMock.static.list,
        ),
      ),
    ),
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
