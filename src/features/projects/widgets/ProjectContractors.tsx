import { ProjectContractor } from "@/api/project/project.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WorkspaceWidget } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { SortableQueryBase } from "@/features/_common/filters/SorterWidget.tsx";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { Check, Loader2 } from "lucide-react";

export interface ProjectContractorsProps extends WithFrontServices {
  projectId: number;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

const c = createColumnHelper<ProjectContractor>();

type EditAssociationFormModel = {
  workspaceId: number | null;
};

interface EditContractorAssociationFormProps extends WithFrontServices {
  projectId: Project["id"];
  contractorId: number;
  defaultWorkspaceId: number | null;
  onSubmit: (workspaceId: number) => Promise<void>;
  onCancel: () => void;
}

function EditContractorAssociationForm(
  props: EditContractorAssociationFormProps,
) {
  const promise = promiseState.useRemoteData<void>();

  const form = useForm<EditAssociationFormModel>({
    defaultValues: {
      workspaceId: props.defaultWorkspaceId,
    },
  });

  async function handleSubmit(data: EditAssociationFormModel) {
    if (data.workspaceId === null) {
      return;
    }
    void promise.track(props.onSubmit(data.workspaceId));
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4 min-w-[20rem]"
      >
        <FormField
          control={form.control}
          name="workspaceId"
          rules={{ required: "Workspace is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace</FormLabel>
              <FormControl>
                <WorkspacePicker
                  value={field.value}
                  onSelect={field.onChange}
                  services={props.services}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {rd
              .fullJourney(promise.state)
              .initially(null)
              .wait(<Loader2 className="w-4 h-4 animate-spin" />)
              .catch(renderSmallError("w-4 h-4"))
              .map(() => (
                <Check className="w-4 h-4" />
              ))}
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Simple query type for project contractors list
type ProjectContractorsQuery = SortableQueryBase;

interface ContractorActionsCellProps extends WithFrontServices {
  projectId: number;
  contractor: ProjectContractor;
}

function ContractorActionsCell(props: ContractorActionsCellProps) {
  const contractorId = props.contractor.contractor.id;

  return (
    <ActionMenu services={props.services}>
      <InlinePopoverForm
        trigger={
          <ActionMenuEditItem onSelect={(e) => e.preventDefault()}>
            Edit association
          </ActionMenuEditItem>
        }
        content={(bag) => (
          <>
            <PopoverHeader>Edit association</PopoverHeader>
            <EditContractorAssociationForm
              projectId={props.projectId}
              contractorId={contractorId}
              defaultWorkspaceId={props.contractor.workspaceId ?? null}
              services={props.services}
              onCancel={bag.close}
              onSubmit={async (workspaceId: number) => {
                await props.services.mutationService.updateContractorWorkspaceForProject(
                  props.projectId,
                  contractorId,
                  workspaceId,
                );
                await props.services.projectService.ensureProjectContractors(
                  props.projectId,
                );
                bag.close();
              }}
            />
          </>
        )}
      />
      <ActionMenuDeleteItem
        onClick={() => {
          return props.services.mutationService.unassignContractorFromProject(
            props.projectId,
            contractorId,
          );
        }}
      >
        Unassign Contractor
      </ActionMenuDeleteItem>
    </ActionMenu>
  );
}

export function ProjectContractors(props: ProjectContractorsProps) {
  const projectContractors =
    props.services.projectService.useProjectContractors(props.projectId);

  const emptyQuery = useMemo<ProjectContractorsQuery>(
    () => ({
      sort: null,
      page: paginationUtils.ofDefault(),
    }),
    [],
  );

  return (
    <>
      <ListView
        data={projectContractors}
        query={emptyQuery}
        onQueryChange={() => {}}
        getRowId={(x) => x.contractor.id}
        columns={[
          c.accessor("contractor.name", {
            header: "Name",
          }),
          c.accessor("contractor.fullName", {
            header: "Full Name",
          }),
          c.display({
            id: "workspace",
            header: "Workspace",
            cell: (info) =>
              info.row.original.workspaceId ? (
                <WorkspaceWidget
                  workspaceId={info.row.original.workspaceId}
                  services={props.services}
                  layout="full"
                  size="sm"
                />
              ) : (
                <span className="text-slate-400">Not set</span>
              ),
          }),
          c.display({
            id: "actions",
            cell: (info) => (
              <ContractorActionsCell
                projectId={props.projectId}
                contractor={info.row.original}
                services={props.services}
              />
            ),
          }),
        ]}
      />
    </>
  );
}
