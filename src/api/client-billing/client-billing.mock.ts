import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const clientBillingMock = createMockFactory<ClientBilling>(
  () => ({
    clientId: faker.number.int(),
    totalGross: faker.number.float(),
    totalNet: faker.number.float(),
    client: null,
    currency: faker.helpers.arrayElement(["pln", "eur", "usd"]),
    description: faker.lorem.sentence(),
    createdAt: faker.date.recent(),
    linkBillingReport: [],
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
      client: null,
      currency: "pln",
      workspaceId: workspaceMock.static.list[0].id,
      clientId: 1,
      invoiceDate: new Date("2021-09-01"),
      invoiceNumber: "2025/09/01-AS/TW",
      linkBillingReport: [],
      createdAt: new Date("2021-09-01"),
      description: "Test description",
      totalNet: 12000,
      totalGross: 14760,
    },
  ],
);
