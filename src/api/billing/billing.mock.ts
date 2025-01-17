import { BillingBase } from "@/api/billing/billing.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const billingMock = createMockFactory<BillingBase>(
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
  }),
  [
    {
      id: 1,
      currency: "pln",
      workspaceId: workspaceMock.static.list[0].id,
      clientId: 1,
      invoiceDate: new Date("2021-09-01"),
      invoiceNumber: "2025/09/01-AS/TW",
      createdAt: new Date("2021-09-01"),
      description: "Test description",
      totalNet: 12000,
      totalGross: 14760,
    },
  ],
);
