import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { assert } from "@/platform/lang/assert.ts";

export function AddContractorPopover(
  props: WithFrontServices & { projectId: Project["id"] },
) {
  return (
    <ContractorPicker
      variant="accent1"
      size="sm"
      services={props.services}
      value={null}
      query={contractorQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "matchNone",
          value: [props.projectId],
        }),
      ])}
      placeholder="Add contractor"
      // todo contractor picker should accept extra query param to narrow down the list to not match this project
      onSelect={(contractorId) => {
        assert(
          unassignedUtils.isAssigned(contractorId),
          "Contractor must be unassigned",
        );
        return props.services.mutationService.addContractorToProject(
          props.projectId,
          contractorId,
        );
      }}
    />
  );
}
