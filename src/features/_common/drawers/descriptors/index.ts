import type { ReactNode } from "react";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { billingDrawerDescriptor } from "./billingDescriptor";
import type { BillingSpec } from "./billingDescriptor";
import { billingFormDrawerDescriptor } from "./billingFormDescriptor";
import type { BillingFormSpec } from "./billingFormDescriptor";
import { costDrawerDescriptor } from "./costDescriptor";
import type { CostSpec } from "./costDescriptor";
import { costFormDrawerDescriptor } from "./costFormDescriptor";
import type { CostFormSpec } from "./costFormDescriptor";
import { reportDrawerDescriptor } from "./reportDescriptor";
import type { ReportSpec } from "./reportDescriptor";
import { reportFormDrawerDescriptor } from "./reportFormDescriptor";
import type { ReportFormSpec } from "./reportFormDescriptor";

/** Any item that can be on the drawer stack (detail or form). */
export type EntityStackItem =
  | ReportSpec
  | CostSpec
  | BillingSpec
  | ReportFormSpec
  | CostFormSpec
  | BillingFormSpec;

export type { ReportSpec, CostSpec, BillingSpec };
export type { ReportFormSpec, CostFormSpec, BillingFormSpec };

export { reportDrawerDescriptor, costDrawerDescriptor, billingDrawerDescriptor };
export {
  reportFormDrawerDescriptor,
  costFormDrawerDescriptor,
  billingFormDrawerDescriptor,
};

export function getEntityStackKey(entity: EntityStackItem): string {
  switch (entity.type) {
    case "report":
      return reportDrawerDescriptor.getKey(entity);
    case "report-form":
      return reportFormDrawerDescriptor.getKey(entity);
    case "cost":
      return costDrawerDescriptor.getKey(entity);
    case "cost-form":
      return costFormDrawerDescriptor.getKey(entity);
    case "billing":
      return billingDrawerDescriptor.getKey(entity);
    case "billing-form":
      return billingFormDrawerDescriptor.getKey(entity);
  }
}

/**
 * Barrel: one descriptor that handles any stack entity (detail or form).
 * Drawer and state use this + getEntityStackKey only.
 */
export const entityDrawerDescriptor: DrawerDescriptor<EntityStackItem> = {
  getKey: getEntityStackKey,
  getLabel: (entity) => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.getLabel(entity);
      case "report-form":
        return reportFormDrawerDescriptor.getLabel(entity);
      case "cost":
        return costDrawerDescriptor.getLabel(entity);
      case "cost-form":
        return costFormDrawerDescriptor.getLabel(entity);
      case "billing":
        return billingDrawerDescriptor.getLabel(entity);
      case "billing-form":
        return billingFormDrawerDescriptor.getLabel(entity);
    }
  },
  getTitle: (entity) => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.getTitle(entity);
      case "report-form":
        return reportFormDrawerDescriptor.getTitle(entity);
      case "cost":
        return costDrawerDescriptor.getTitle(entity);
      case "cost-form":
        return costFormDrawerDescriptor.getTitle(entity);
      case "billing":
        return billingDrawerDescriptor.getTitle(entity);
      case "billing-form":
        return billingFormDrawerDescriptor.getTitle(entity);
    }
  },
  renderBreadcrumbLabel: (
    entity: EntityStackItem,
    services: DrawerDescriptorServices,
  ): ReactNode => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "report-form":
        return reportFormDrawerDescriptor.renderBreadcrumbLabel(
          entity,
          services,
        );
      case "cost":
        return costDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "cost-form":
        return costFormDrawerDescriptor.renderBreadcrumbLabel(
          entity,
          services,
        );
      case "billing":
        return billingDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "billing-form":
        return billingFormDrawerDescriptor.renderBreadcrumbLabel(
          entity,
          services,
        );
    }
  },
  renderSmallPreview: (
    entity: EntityStackItem,
    services: DrawerDescriptorServices,
  ): ReactNode => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.renderSmallPreview(entity, services);
      case "report-form":
        return reportFormDrawerDescriptor.renderSmallPreview(entity, services);
      case "cost":
        return costDrawerDescriptor.renderSmallPreview(entity, services);
      case "cost-form":
        return costFormDrawerDescriptor.renderSmallPreview(entity, services);
      case "billing":
        return billingDrawerDescriptor.renderSmallPreview(entity, services);
      case "billing-form":
        return billingFormDrawerDescriptor.renderSmallPreview(entity, services);
    }
  },
  renderDrawerContent: (
    entity: EntityStackItem,
    services: DrawerDescriptorServices,
  ): ReactNode => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.renderDrawerContent(entity, services);
      case "report-form":
        return reportFormDrawerDescriptor.renderDrawerContent(entity, services);
      case "cost":
        return costDrawerDescriptor.renderDrawerContent(entity, services);
      case "cost-form":
        return costFormDrawerDescriptor.renderDrawerContent(entity, services);
      case "billing":
        return billingDrawerDescriptor.renderDrawerContent(entity, services);
      case "billing-form":
        return billingFormDrawerDescriptor.renderDrawerContent(entity, services);
    }
  },
  renderHeaderActions: (
    entity: EntityStackItem,
    services: DrawerDescriptorServices,
  ): ReactNode => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.renderHeaderActions?.(entity, services);
      case "report-form":
        return null;
      case "cost":
        return costDrawerDescriptor.renderHeaderActions?.(entity, services);
      case "cost-form":
        return null;
      case "billing":
        return billingDrawerDescriptor.renderHeaderActions?.(entity, services);
      case "billing-form":
        return null;
    }
  },
};
