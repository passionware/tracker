import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const costMock = createMockFactory<Cost>(
  () => ({
    id: faker.number.int(),
    contractor: null,
    invoiceDate: faker.date.recent(),
    currency: faker.helpers.arrayElement(["PLN", "EUR", "USD"]),
    workspaceId: faker.helpers.arrayElement(
      workspaceMock.static.list.map((w) => w.id),
    ),
    description: faker.lorem.sentence(),
    counterparty: faker.company.name(),
    contractorId: faker.helpers.arrayElement(
      contractorMock.static.list.map((c) => c.id),
    ),
    grossValue: faker.number.float(),
    netValue: faker.number.float(),
    linkReports: [],
    createdAt: faker.date.recent(),
    invoiceNumber: faker.string.alphanumeric(),
  }),
  [
    {
      id: 1,
      createdAt: faker.date.recent(),
      linkReports: [],
      netValue: 12000,
      grossValue: 14760,
      contractorId: contractorMock.static.list[0].id,
      description: "Test description",
      workspaceId: workspaceMock.static.list[0].id,
      invoiceDate: new Date("2021-09-01"),
      contractor: null,
      currency: "PLN",
      counterparty: "Test counterparty",
      invoiceNumber: "2025/09/01",
    },
  ],
);