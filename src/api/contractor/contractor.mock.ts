import { Contractor } from "@/api/contractor/contractor.api.ts";
import { projectMock } from "@/api/project/project.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const contractorMock = createMockFactory<Contractor>(
  () => ({
    id: faker.number.int(),
    createdAt: faker.date.recent(),
    name: faker.hacker.verb(),
    fullName: faker.person.fullName(),
    projectIds: [],
  }),
  [
    {
      id: 0,
      name: "John",
      createdAt: new Date("2021-01-01"),
      fullName: "John Doe",
      projectIds: [projectMock.static.list[0].id],
    },
    {
      id: 1,
      name: "Jane",
      createdAt: new Date("2021-01-02"),
      fullName: "Jane Doe",
      projectIds: [projectMock.static.list[0].id],
    },
    {
      id: 2,
      name: "Jack",
      createdAt: new Date("2021-01-03"),
      fullName: "Jack Sparrow",
      projectIds: [],
    },
  ],
);
