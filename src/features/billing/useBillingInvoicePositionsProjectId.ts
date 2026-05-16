import type { Billing } from "@/api/billing/billing.api.ts";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor.tsx";
import { maybe, rd } from "@passionware/monads";
import { useMemo } from "react";

export function useBillingInvoicePositionsProjectId(
  rows: Billing["linkBillingReport"][number][],
  services: DrawerDescriptorServices,
  explicitProjectId?: number,
): number | null {
  const iterationIds = useMemo(() => {
    const ids = new Set<number>();
    for (const row of rows) {
      const iterationId = row.report?.projectIterationId;
      if (iterationId != null) {
        ids.add(iterationId);
      }
    }
    return [...ids];
  }, [rows]);

  const iterationsRd = services.projectIterationService.useProjectIterationById(
    iterationIds.length > 0 ? iterationIds : maybe.ofAbsent(),
  );

  const resolvedFromRows = useMemo(() => {
    if (!rd.isSuccess(iterationsRd)) {
      return null;
    }
    const projectIds = new Set<number>();
    for (const iteration of Object.values(iterationsRd.data)) {
      projectIds.add(iteration.projectId);
    }
    if (projectIds.size !== 1) {
      return null;
    }
    return [...projectIds][0] ?? null;
  }, [iterationsRd]);

  if (explicitProjectId != null && explicitProjectId > 0) {
    return explicitProjectId;
  }
  return resolvedFromRows;
}
