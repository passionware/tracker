import type { ReactNode } from "react";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { billingDrawerDescriptor } from "./billingDescriptor";
import type { BillingSpec } from "./billingDescriptor";
import { billingFormDrawerDescriptor } from "./billingFormDescriptor";
import type { BillingFormSpec } from "./billingFormDescriptor";
import { clientDrawerDescriptor } from "./clientDescriptor";
import type { ClientDrawerSpec } from "@/features/clients/clientDrawerViews.tsx";
import { clientFormDrawerDescriptor } from "./clientFormDescriptor";
import type { ClientFormSpec } from "./clientFormDescriptor";
import { costDrawerDescriptor } from "./costDescriptor";
import type { CostSpec } from "./costDescriptor";
import { costFormDrawerDescriptor } from "./costFormDescriptor";
import type { CostFormSpec } from "./costFormDescriptor";
import { reportDrawerDescriptor } from "./reportDescriptor";
import type { ReportSpec } from "./reportDescriptor";
import { reportFormDrawerDescriptor } from "./reportFormDescriptor";
import type { ReportFormSpec } from "./reportFormDescriptor";
import { workspaceDrawerDescriptor } from "./workspaceDescriptor";
import type { WorkspaceDrawerSpec } from "@/features/workspaces/workspaceDrawerViews.tsx";
import { workspaceFormDrawerDescriptor } from "./workspaceFormDescriptor";
import type { WorkspaceFormSpec } from "./workspaceFormDescriptor";
import { projectIterationEventDrawerDescriptor } from "./projectIterationEventDescriptor";
import type { ProjectIterationEventSpec } from "./projectIterationEventDescriptor";

/** Any item that can be on the drawer stack (detail or form). */
export type EntityStackItem =
  | ReportSpec
  | CostSpec
  | BillingSpec
  | ClientDrawerSpec
  | ClientFormSpec
  | ReportFormSpec
  | CostFormSpec
  | BillingFormSpec
  | WorkspaceDrawerSpec
  | WorkspaceFormSpec
  | ProjectIterationEventSpec;

export type { ReportSpec, CostSpec, BillingSpec, ClientDrawerSpec };
export type { ReportFormSpec, CostFormSpec, BillingFormSpec, ClientFormSpec };
export type { WorkspaceDrawerSpec, WorkspaceFormSpec };
export type { ProjectIterationEventSpec };

export {
  reportDrawerDescriptor,
  costDrawerDescriptor,
  billingDrawerDescriptor,
  clientDrawerDescriptor,
  workspaceDrawerDescriptor,
};
export {
  reportFormDrawerDescriptor,
  costFormDrawerDescriptor,
  billingFormDrawerDescriptor,
  clientFormDrawerDescriptor,
  workspaceFormDrawerDescriptor,
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
    case "client":
      return clientDrawerDescriptor.getKey(entity);
    case "client-form":
      return clientFormDrawerDescriptor.getKey(entity);
    case "workspace":
      return workspaceDrawerDescriptor.getKey(entity);
    case "workspace-form":
      return workspaceFormDrawerDescriptor.getKey(entity);
    case "project-iteration-event":
      return projectIterationEventDrawerDescriptor.getKey(entity);
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
      case "client":
        return clientDrawerDescriptor.getLabel(entity);
      case "client-form":
        return clientFormDrawerDescriptor.getLabel(entity);
      case "workspace":
        return workspaceDrawerDescriptor.getLabel(entity);
      case "workspace-form":
        return workspaceFormDrawerDescriptor.getLabel(entity);
      case "project-iteration-event":
        return projectIterationEventDrawerDescriptor.getLabel(entity);
    }
  },
  getTitle: (entity) => {
    switch (entity.type) {
      case "report":
        return reportDrawerDescriptor.getTitle();
      case "report-form":
        return reportFormDrawerDescriptor.getTitle(entity);
      case "cost":
        return costDrawerDescriptor.getTitle();
      case "cost-form":
        return costFormDrawerDescriptor.getTitle(entity);
      case "billing":
        return billingDrawerDescriptor.getTitle(entity);
      case "billing-form":
        return billingFormDrawerDescriptor.getTitle(entity);
      case "client":
        return clientDrawerDescriptor.getTitle(entity);
      case "client-form":
        return clientFormDrawerDescriptor.getTitle(entity);
      case "workspace":
        return workspaceDrawerDescriptor.getTitle(entity);
      case "workspace-form":
        return workspaceFormDrawerDescriptor.getTitle(entity);
      case "project-iteration-event":
        return projectIterationEventDrawerDescriptor.getTitle(entity);
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
        return reportFormDrawerDescriptor.renderBreadcrumbLabel(entity);
      case "cost":
        return costDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "cost-form":
        return costFormDrawerDescriptor.renderBreadcrumbLabel(entity);
      case "billing":
        return billingDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "billing-form":
        return billingFormDrawerDescriptor.renderBreadcrumbLabel(entity);
      case "client":
        return clientDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "client-form":
        return clientFormDrawerDescriptor.renderBreadcrumbLabel(entity);
      case "workspace":
        return workspaceDrawerDescriptor.renderBreadcrumbLabel(entity, services);
      case "workspace-form":
        return workspaceFormDrawerDescriptor.renderBreadcrumbLabel(entity);
      case "project-iteration-event":
        return projectIterationEventDrawerDescriptor.renderBreadcrumbLabel(
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
        return reportFormDrawerDescriptor.renderSmallPreview();
      case "cost":
        return costDrawerDescriptor.renderSmallPreview(entity, services);
      case "cost-form":
        return costFormDrawerDescriptor.renderSmallPreview();
      case "billing":
        return billingDrawerDescriptor.renderSmallPreview(entity, services);
      case "billing-form":
        return billingFormDrawerDescriptor.renderSmallPreview();
      case "client":
        return clientDrawerDescriptor.renderSmallPreview(entity, services);
      case "client-form":
        return clientFormDrawerDescriptor.renderSmallPreview(entity, services);
      case "workspace":
        return workspaceDrawerDescriptor.renderSmallPreview(entity, services);
      case "workspace-form":
        return workspaceFormDrawerDescriptor.renderSmallPreview(entity, services);
      case "project-iteration-event":
        return projectIterationEventDrawerDescriptor.renderSmallPreview(
          entity,
          services,
        );
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
        return billingFormDrawerDescriptor.renderDrawerContent(
          entity,
          services,
        );
      case "client":
        return clientDrawerDescriptor.renderDrawerContent(entity, services);
      case "client-form":
        return clientFormDrawerDescriptor.renderDrawerContent(entity, services);
      case "workspace":
        return workspaceDrawerDescriptor.renderDrawerContent(entity, services);
      case "workspace-form":
        return workspaceFormDrawerDescriptor.renderDrawerContent(entity, services);
      case "project-iteration-event":
        return projectIterationEventDrawerDescriptor.renderDrawerContent(
          entity,
          services,
        );
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
      case "client":
        return clientDrawerDescriptor.renderHeaderActions?.(entity, services);
      case "client-form":
        return null;
      case "workspace":
        return workspaceDrawerDescriptor.renderHeaderActions?.(entity, services);
      case "workspace-form":
        return null;
      case "project-iteration-event":
        return null;
    }
  },
};
