import { Contractor } from "@/api/contractor/contractor.api.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const contractorMock = createMockFactory<Contractor>(
  () => ({
    id: faker.number.int(),
    createdAt: faker.date.recent(),
    name: faker.hacker.verb(),
    fullName: faker.person.fullName(),
  }),
  [
    {
      id: 0,
      name: "John",
      createdAt: new Date("2021-01-01"),
      fullName: "John Doe",
    },
    {
      id: 1,
      name: "Jane",
      createdAt: new Date("2021-01-02"),
      fullName: "Jane Doe",
    },
    {
      id: 2,
      name: "Jack",
      createdAt: new Date("2021-01-03"),
      fullName: "Jack Sparrow",
    },
  ],
);
