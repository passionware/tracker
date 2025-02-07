import { clientsMock } from "@/api/clients/clients.mock.ts";
import { ProjectBase } from "@/api/project/project.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const projectMock = createMockFactory<ProjectBase>(
  () => ({
    id: faker.number.int(),
    name: faker.word.noun(),
    status: faker.helpers.arrayElement(["draft", "active", "closed"]),
    createdAt: faker.date.recent(),
    description: faker.lorem.sentence(),
    clientId: faker.helpers.arrayElement(clientsMock.static.list).id,
    workspaceId: faker.helpers.arrayElement(workspaceMock.static.list).id,
  }),
  [
    {
      id: 1,
      name: "Project 1",
      status: "draft",
      createdAt: new Date("2021-01-01"),
      description: "This is a project",
      clientId: clientsMock.static.list[0].id,
      workspaceId: workspaceMock.static.list[0].id,
    },
    {
      id: 2,
      name: "Project 2",
      status: "active",
      createdAt: new Date("2021-02-01"),
      description: "This is another project",
      clientId: clientsMock.static.list[1].id,
      workspaceId: workspaceMock.static.list[1].id,
    },
    {
      id: 3,
      name: "Project 3",
      status: "closed",
      createdAt: new Date("2021-03-01"),
      description: "This is yet another project",
      clientId: clientsMock.static.list[1].id,
      workspaceId: workspaceMock.static.list[1].id,
    },
  ],
);
