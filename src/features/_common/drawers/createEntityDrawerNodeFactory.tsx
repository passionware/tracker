import {
  createBillingDetailDrawerNodeFactory,
  createBillingFormDrawerNodeFactory,
} from "./billingDrawerNodeFactory";
import type { BillingFormEntity } from "./billingDrawerNodeFactory";
import {
  createCostDetailDrawerNodeFactory,
  createCostFormDrawerNodeFactory,
} from "./costDrawerNodeFactory";
import type { CostFormEntity } from "./costDrawerNodeFactory";
import type {
  DrawerContext,
  DrawerServices,
} from "./entityDrawerNodeFactory.types";
import {
  createReportDetailDrawerNodeFactory,
  createReportFormDrawerNodeFactory,
} from "./reportDrawerNodeFactory";
import type { ReportFormEntity } from "./reportDrawerNodeFactory";
import { setCurrentCreateNode } from "./entityDrawerCreateNode";
import type {
  EntityDrawerNode,
  EntityDrawerTarget,
} from "./useEntityDrawerState";
import type {
  BillingViewEntry,
  CostEntry,
  ReportViewEntry,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";

/** Union of all form targets (edit/duplicate) for the entity drawer. */
export type EntityFormTarget =
  | ReportFormEntity
  | CostFormEntity
  | BillingFormEntity;

export interface CreateEntityDrawerNodeFactoryProps extends DrawerServices {
  reportById: Map<number, ReportViewEntry>;
  costById: Map<number, CostEntry>;
  billingById: Map<number, BillingViewEntry>;
  context: DrawerContext;
  pushEntityDrawer: (node: EntityDrawerNode) => void;
  popEntityDrawer?: () => void;
}

type CreateNodeFn = (entity: unknown) => EntityDrawerNode;

function isEntityDrawerEntity(
  entity: unknown,
): entity is EntityDrawerTarget | EntityFormTarget {
  return (
    typeof entity === "object" && entity !== null && "type" in entity
  );
}

export function createEntityDrawerNodeFactory(
  props: CreateEntityDrawerNodeFactoryProps,
) {
  const {
    reportById,
    costById,
    billingById,
    context,
    services,
    pushEntityDrawer,
    popEntityDrawer,
  } = props;

  const createNode: CreateNodeFn = (entity) => {
    if (!isEntityDrawerEntity(entity)) {
      throw new Error("Invalid entity for entity drawer");
    }
    const f = factories;
    switch (entity.type) {
      case "report":
        return f.reportDetail(entity);
      case "report-form":
        return f.reportForm(entity);
      case "cost":
        return f.costDetail(entity);
      case "cost-form":
        return f.costForm(entity);
      case "billing":
        return f.billingDetail(entity);
      case "billing-form":
        return f.billingForm(entity);
    }
  };

  setCurrentCreateNode(createNode);

  const factories = {
    reportDetail: createReportDetailDrawerNodeFactory({
      reportById,
      context,
      services,
      pushEntityDrawer,
      popEntityDrawer,
    }),
    reportForm: createReportFormDrawerNodeFactory({
      services,
      popEntityDrawer,
    }),
    costDetail: createCostDetailDrawerNodeFactory({
      costById,
      context,
      services,
      pushEntityDrawer,
      popEntityDrawer,
    }),
    costForm: createCostFormDrawerNodeFactory({
      services,
      popEntityDrawer,
    }),
    billingDetail: createBillingDetailDrawerNodeFactory({
      billingById,
      services,
      pushEntityDrawer,
      popEntityDrawer,
    }),
    billingForm: createBillingFormDrawerNodeFactory({
      services,
      popEntityDrawer,
    }),
  };

  return createNode;
}
