import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { assert } from "@/platform/lang/assert.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";

type FormModel = {
  contractorId: number | null;
  workspaceId: number | null;
};

export interface AddContractorFormProps extends WithFrontServices {
  projectId: Project["id"];
  defaultValues?: Partial<FormModel>;
  onSubmit: (data: {
    contractorId: number;
    workspaceId: number;
  }) => Promise<void>;
  onCancel: () => void;
}

function AddContractorForm(props: AddContractorFormProps) {
  const promise = promiseState.useRemoteData<void>();

  const form = useForm<FormModel>({
    defaultValues: {
      contractorId: props.defaultValues?.contractorId ?? null,
      workspaceId: props.defaultValues?.workspaceId ?? null,
    },
  });

  async function handleSubmit(data: FormModel) {
    assert(
      unassignedUtils.isAssigned(data.contractorId),
      "Contractor must be selected",
    );
    assert(
      unassignedUtils.isAssigned(data.workspaceId),
      "Workspace must be selected",
    );

    void promise.track(
      props.onSubmit({
        contractorId: data.contractorId!,
        workspaceId: data.workspaceId!,
      }),
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4 min-w-[20rem]"
      >
        <FormField
          control={form.control}
          name="contractorId"
          rules={{ required: "Contractor is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contractor</FormLabel>
              <FormControl>
                <ContractorPicker
                  value={field.value}
                  onSelect={field.onChange}
                  services={props.services}
                  query={contractorQueryUtils.getBuilder().build((q) => [
                    q.withFilter("projectId", {
                      operator: "matchNone",
                      value: [props.projectId],
                    }),
                  ])}
                  placeholder="Select contractor"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
            Add
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function AddContractorPopover(
  props: WithFrontServices & { projectId: Project["id"] },
) {
  const promise = promiseState.useRemoteData<void>();

  return (
    <InlinePopoverForm
      trigger={
        <Button variant="accent1" size="sm" className="flex">
          {rd
            .fullJourney(promise.state)
            .initially(<PlusCircle />)
            .wait(<Loader2 />)
            .catch(renderSmallError("w-6 h-6"))
            .map(() => (
              <Check />
            ))}
          Add contractor
        </Button>
      }
      content={(bag) => (
        <>
          <PopoverHeader>Add contractor</PopoverHeader>
          <AddContractorForm
            projectId={props.projectId}
            services={props.services}
            onCancel={bag.close}
            onSubmit={async (data) => {
              await promise.track(
                props.services.mutationService.addContractorToProject(
                  props.projectId,
                  data.contractorId,
                  data.workspaceId,
                ),
              );
              bag.close();
            }}
          />
        </>
      )}
    />
  );
}
