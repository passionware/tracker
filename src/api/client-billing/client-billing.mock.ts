import { ClientBillingBase } from "@/api/client-billing/client-billing.api.ts";
import { clientsMock } from "@/api/clients/clients.mock.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const clientBillingMock = createMockFactory<ClientBillingBase>(
  () => ({
    clientId: faker.number.int(),
    totalGross: faker.number.float(),
    totalNet: faker.number.float(),
    currency: faker.helpers.arrayElement(["pln", "eur", "usd"]),
    description: faker.lorem.sentence(),
    createdAt: faker.date.recent(),
    id: faker.number.int(),
    invoiceNumber: faker.string.alphanumeric(),
    invoiceDate: faker.date.recent(),
    workspaceId: faker.helpers.arrayElement(
      workspaceMock.static.list.map((w) => w.id),
    ),
    billingBalance: faker.number.float(),
    totalBillingValue: faker.number.float(),
    billingReportValue: faker.number.float(),
    remainingBalance: faker.number.float(),
    client: clientsMock.static.list[0],
  }),
  [
    {
      id: 1,
      client: clientsMock.static.list[0],
      currency: "pln",
      workspaceId: workspaceMock.static.list[0].id,
      clientId: 1,
      invoiceDate: new Date("2021-09-01"),
      invoiceNumber: "2025/09/01-AS/TW",
      createdAt: new Date("2021-09-01"),
      description: "Test description",
      totalNet: 12000,
      totalGross: 14760,
      billingBalance: 0,
      totalBillingValue: 0,
      remainingBalance: 0,
      billingReportValue: 0,
    },
  ],
);
