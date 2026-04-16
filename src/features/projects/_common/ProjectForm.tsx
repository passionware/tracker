import { ProjectPayload } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { DrawerFooter } from "@/components/ui/drawer.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { WorkspaceArrayPicker } from "@/features/_common/elements/pickers/WorkspaceArrayPicker";
import {
  DEFAULT_INVOICE_EMAIL_BODY_MARKDOWN,
  DEFAULT_REMINDER_EMAIL_BODY_MARKDOWN,
} from "@/features/_common/emailTemplates/emailBodyTemplate";
import {
  DEFAULT_EMAIL_SUBJECT_TEMPLATE_INVOICE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE_REMINDER,
} from "@/features/_common/emailTemplates/emailSubjectTemplate";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, Loader2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  ProjectEmailTemplatePreview,
  type ProjectEmailTemplateTab,
} from "./ProjectEmailTemplatePreview.tsx";
import type { ProjectFormModel } from "./projectFormModel.ts";

export interface ProjectFormProps
  extends WithServices<
    [WithClientService, WithWorkspaceService, WithFormatService]
  > {
  defaultValues?: Partial<ProjectPayload>;
  onSubmit: (
    data: ProjectPayload,
    changes: Partial<ProjectPayload>,
  ) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit";
  /**
   * Matches entity drawer stack pattern used by `ClientForm` / `WorkspaceForm` (`bulkCostDrawer`).
   */
  layout?: "default" | "bulkCostDrawer";
}

export function ProjectForm(props: ProjectFormProps) {
  const layout = props.layout ?? "default";
  const isBulk = layout === "bulkCostDrawer";
  const [emailTemplateTab, setEmailTemplateTab] =
    useState<ProjectEmailTemplateTab>("invoice");
  const form = useForm<ProjectFormModel>({
    defaultValues: {
      name: props.defaultValues?.name ?? "",
      status: props.defaultValues?.status ?? "draft",
      description: props.defaultValues?.description ?? "",
      clientId: props.defaultValues?.clientId ?? null,
      workspaceIds: props.defaultValues?.workspaceIds ?? [],
      defaultBillingDueDays: props.defaultValues?.defaultBillingDueDays ?? 14,
      reportDefaults: {
        invoiceEmail: {
          titleTemplate:
            props.defaultValues?.reportDefaults?.invoiceEmail?.titleTemplate ??
            "",
          bodyMarkdownTemplate:
            props.defaultValues?.reportDefaults?.invoiceEmail?.bodyMarkdownTemplate ??
            "",
        },
        reminderEmail: {
          titleTemplate:
            props.defaultValues?.reportDefaults?.reminderEmail?.titleTemplate ??
            "",
          bodyMarkdownTemplate:
            props.defaultValues?.reportDefaults?.reminderEmail?.bodyMarkdownTemplate ??
            "",
        },
      },
    },
  });

  const processingPromise = promiseState.useRemoteData<void>();

  function handleSubmit(data: ProjectFormModel) {
    const dueDays = Math.max(0, Math.floor(Number(data.defaultBillingDueDays)));
    const allData: ProjectPayload = {
      name: data.name,
      status: data.status,
      description: data.description || null,
      clientId: maybe.getOrThrow(data.clientId, "Client is required"),
      workspaceIds: maybe.getOrThrow(
        maybe.fromArray(data.workspaceIds),
        "At least one workspace is required",
      ),
      defaultBillingDueDays: Number.isFinite(dueDays) ? dueDays : 14,
      reportDefaults: {
        invoiceEmail: {
          titleTemplate:
            data.reportDefaults.invoiceEmail.titleTemplate.trim() || null,
          bodyMarkdownTemplate:
            data.reportDefaults.invoiceEmail.bodyMarkdownTemplate.trim() || null,
        },
        reminderEmail: {
          titleTemplate:
            data.reportDefaults.reminderEmail.titleTemplate.trim() || null,
          bodyMarkdownTemplate:
            data.reportDefaults.reminderEmail.bodyMarkdownTemplate.trim() || null,
        },
      },
    };
    void processingPromise.track(
      props.onSubmit(allData, getDirtyFields(allData, form)),
    );
  }

  const workspaceField = (
    <FormField
      control={form.control}
      name="workspaceIds"
      render={({ field }) => (
        <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Workspace
          </FormLabel>
          <FormControl>
            <WorkspaceArrayPicker
              value={field.value}
              onSelect={field.onChange}
              services={props.services}
            />
          </FormControl>
          <FormDescription>Select workspace</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const clientField = (
    <FormField
      control={form.control}
      name="clientId"
      render={({ field }) => (
        <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Client
          </FormLabel>
          <FormControl>
            <ClientPicker
              value={field.value}
              onSelect={field.onChange}
              services={props.services}
            />
          </FormControl>
          <FormDescription>Select client</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const nameField = (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Project Name
          </FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>Enter project name</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const statusField = (
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Status
          </FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const descriptionField = (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem className="col-span-2">
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Description
          </FormLabel>
          <FormControl>
            <Textarea {...field} />
          </FormControl>
          <FormDescription>Enter description</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const emailLoadDefaultBtnClass =
    "h-7 shrink-0 px-2 text-xs font-normal text-muted-foreground hover:text-foreground";

  const defaultBillingDueDaysField = (
    <FormField
      control={form.control}
      name="defaultBillingDueDays"
      rules={{
        validate: (v) =>
          Number.isFinite(v) && v >= 0 ? true : "Enter zero or more days",
      }}
      render={({ field }) => (
        <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Default billing due (days after iteration end)
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              min={0}
              step={1}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
              value={Number.isFinite(field.value) ? field.value : ""}
            />
          </FormControl>
          <FormDescription>
            Used when creating draft billings from reconciliation (due date =
            iteration end + this many days).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const reportEmailFields = (
    <div className="col-span-full space-y-4 rounded-xl border border-border bg-muted/15 p-4 sm:col-span-2 dark:bg-muted/10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Cockpit email templates
        </p>
        <p className="text-xs text-muted-foreground">
          Edit the invoice or reminder email; the preview on the right follows
          the tab you select.
        </p>
      </div>
      <Tabs
        value={emailTemplateTab}
        onValueChange={(v) =>
          setEmailTemplateTab(v as ProjectEmailTemplateTab)
        }
        className="w-full gap-4"
      >
        <TabsList
          size="sm"
          className="!grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1"
        >
          <TabsTrigger
            value="invoice"
            size="sm"
            className="h-8 w-full justify-center rounded-md border-b-0 border-transparent px-2 text-xs data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
          >
            Invoice template
          </TabsTrigger>
          <TabsTrigger
            value="reminder"
            size="sm"
            className="h-8 w-full justify-center rounded-md border-b-0 border-transparent px-2 text-xs data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
          >
            Reminder template
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoice" className="mt-0 space-y-4 focus:outline-none">
          <FormField
            control={form.control}
            name="reportDefaults.invoiceEmail.titleTemplate"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center justify-between gap-2">
                  <FormLabel className={cn(isBulk && "text-sm font-medium")}>
                    Subject (optional)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={emailLoadDefaultBtnClass}
                    onClick={() =>
                      field.onChange(DEFAULT_EMAIL_SUBJECT_TEMPLATE_INVOICE)
                    }
                  >
                    Load default
                  </Button>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    placeholder='Time & Billing Summary — {{from}} to {{to}}'
                  />
                </FormControl>
                <FormDescription>
                  Placeholders: {"{{from}}"}, {"{{to}}"}, {"{{period}}"} (range
                  text), {"{{workspaceName}}"}, {"{{clientName}}"}. Snapshotted
                  when you publish to the cockpit; leave empty for the default
                  subject pattern.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reportDefaults.invoiceEmail.bodyMarkdownTemplate"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center justify-between gap-2">
                  <FormLabel className={cn(isBulk && "text-sm font-medium")}>
                    Body (optional Markdown)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={emailLoadDefaultBtnClass}
                    onClick={() =>
                      field.onChange(DEFAULT_INVOICE_EMAIL_BODY_MARKDOWN)
                    }
                  >
                    Load default
                  </Button>
                </div>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={isBulk ? 7 : 9}
                    className="min-h-[10rem] font-mono text-xs"
                    placeholder="Use **bold**, lists, and {{period_from}} placeholders."
                  />
                </FormControl>
                <FormDescription>
                  Markdown is converted to Gmail-style inline HTML. Placeholders
                  (HTML-escaped): {"{{period_from}}"}, {"{{period_to}}"}{" "}
                  (aliases {"{{from}}"}, {"{{to}}"}), {"{{workspace_name}}"},{" "}
                  {"{{client_name}}"}. Leave empty for the built-in default
                  (Markdown).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
        <TabsContent value="reminder" className="mt-0 space-y-4 focus:outline-none">
          <FormField
            control={form.control}
            name="reportDefaults.reminderEmail.titleTemplate"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center justify-between gap-2">
                  <FormLabel className={cn(isBulk && "text-sm font-medium")}>
                    Subject (optional)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={emailLoadDefaultBtnClass}
                    onClick={() =>
                      field.onChange(DEFAULT_EMAIL_SUBJECT_TEMPLATE_REMINDER)
                    }
                  >
                    Load default
                  </Button>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Invoice Reminder — Payment Due {{dueDate}}"
                  />
                </FormControl>
                <FormDescription>
                  Same placeholders as the invoice template, plus{" "}
                  {"{{dueDate}}"} (from the published billing due date or the due
                  date you pick in the email preview). When empty, the app uses
                  its built-in reminder subject wording.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reportDefaults.reminderEmail.bodyMarkdownTemplate"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center justify-between gap-2">
                  <FormLabel className={cn(isBulk && "text-sm font-medium")}>
                    Body (optional Markdown)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={emailLoadDefaultBtnClass}
                    onClick={() =>
                      field.onChange(DEFAULT_REMINDER_EMAIL_BODY_MARKDOWN)
                    }
                  >
                    Load default
                  </Button>
                </div>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={isBulk ? 8 : 10}
                    className="min-h-[11rem] font-mono text-xs"
                    placeholder="Markdown; include {{payment_paragraph_html}} for the due-date line."
                  />
                </FormControl>
                <FormDescription>
                  Markdown → inline HTML. Use {"{{period_from}}"},{" "}
                  {"{{period_to}}"}, {"{{payment_paragraph_html}}"} (raw HTML block
                  for the payment line), {"{{workspace_name}}"},{" "}
                  {"{{client_name}}"}. Leave empty for the built-in default.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const previewPanel = (
    <ProjectEmailTemplatePreview
      services={props.services}
      control={form.control}
      formatService={props.services.formatService}
      variant="sideColumn"
      focusedTemplate={emailTemplateTab}
    />
  );

  const leftColumnFields = (
    <>
      {workspaceField}
      {clientField}
      {nameField}
      {statusField}
      {defaultBillingDueDaysField}
      {reportEmailFields}
      {descriptionField}
    </>
  );

  const submitLabel =
    props.mode === "create"
      ? "Submit"
      : isBulk
        ? "Save"
        : "Submit";

  const submitIcon = isBulk ? (
    rd.isPending(processingPromise.state) ? (
      <Loader2 className="size-4 animate-spin" />
    ) : null
  ) : (
    rd
      .fullJourney(processingPromise.state)
      .initially(null)
      .wait(<LoaderCircle className="w-5 animate-spin" />)
      .catch(renderSmallError("size-6"))
      .map(() => <CheckCircle2 />)
  );

  const actions = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={props.onCancel}>
        Cancel
      </Button>
      {props.mode === "edit" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={
          rd.isPending(processingPromise.state) || !form.formState.isDirty
        }
      >
        {submitIcon}
        {submitLabel}
      </Button>
    </div>
  );

  const defaultFormActions = (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
      {props.mode === "create" && (
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
      )}
      {props.mode === "edit" && (
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      )}
      <Button
        type="submit"
        disabled={
          rd.isPending(processingPromise.state) || !form.formState.isDirty
        }
      >
        {submitIcon}
        {submitLabel}
      </Button>
    </div>
  );

  if (isBulk) {
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,58%)] lg:items-stretch lg:gap-6">
            <div className="min-h-0 min-w-0 overflow-y-auto">
              <div className="grid min-w-[20rem] grid-cols-1 gap-4 sm:grid-cols-2">
                {leftColumnFields}
              </div>
            </div>
            <aside className="flex min-h-0 min-w-0 flex-col border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="flex min-h-0 flex-1 flex-col">{previewPanel}</div>
            </aside>
          </div>
          <DrawerFooter className="shrink-0 border-t border-border">
            {actions}
          </DrawerFooter>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex min-w-0 flex-col gap-6"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,56%)] xl:grid-cols-[minmax(0,1fr)_minmax(440px,58%)] lg:items-stretch">
          <div className="grid min-w-0 grid-cols-2 gap-4">
            {leftColumnFields}
          </div>
          <aside className="flex min-h-0 min-w-0 flex-col lg:sticky lg:top-4 lg:h-[calc(100dvh-7rem)] lg:max-h-none">
            {previewPanel}
          </aside>
        </div>
        {defaultFormActions}
      </form>
    </Form>
  );
}
