import { clientsMock } from "@/api/clients/clients.mock.ts";
import { contractorMock } from "@/api/contractor/contractor.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";
import { workspaceMock } from "../workspace/workspace.mock";
import { Variable } from "./variable.api";

export const variableMock = createMockFactory<Variable>(
  () => ({
    id: faker.number.int(),
    clientId:
      faker.helpers.arrayElement([null, ...clientsMock.static.list])?.id ??
      null,
    workspaceId:
      faker.helpers.arrayElement([null, ...workspaceMock.static.list])?.id ??
      null,
    contractorId:
      faker.helpers.arrayElement([null, ...contractorMock.static.list])?.id ??
      null,
    type: faker.helpers.arrayElement(["const", "expression"]),
    value: faker.lorem.sentence(),
    name: faker.lorem.word(),
    updatedAt: faker.date.recent(),
    createdAt: faker.date.recent(),
  }),
  [
    {
      id: 1,
      clientId: 1,
      workspaceId: 1,
      contractorId: 1,
      type: "const",
      value: "3",
      name: "name",
      updatedAt: faker.date.recent(),
      createdAt: faker.date.recent(),
    },
    {
      id: 2,
      clientId: 2,
      workspaceId: 2,
      contractorId: 2,
      type: "expression",
      value:
        "return `https://app.tmetric.com/#/reports/205657/detailed?range=${input.reportStart}-${input.reportEnd}&user=412817&project=902501,937224,899366,960961&client=261186&groupby=description`;",
      name: "name",
      updatedAt: faker.date.recent(),
      createdAt: faker.date.recent(),
    },
  ],
);
