import { Project } from "@/api/project/project.api.ts";
import { variableQueryUtils } from "@/api/variable/variable.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input, NumberInput } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { parseSimpleRate } from "@/services/io/ReportGenerationService/plugins/_common/parseRateConfiguration.ts";
import {
  emptyProjectTmetricConfigurationV1,
  findEffectiveProjectTmetricConfigurationVariable,
  persistProjectTmetricConfigurationVariable,
  projectTmetricConfigurationVariableName,
  projectTmetricConfigurationV1Schema,
  tryParseProjectTmetricConfiguration,
  type ProjectTmetricConfigurationV1,
} from "@/services/io/ReportGenerationService/plugins/_common/projectTmetricConfiguration.ts";
import { maybe, mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CURRENCIES = ["EUR", "USD", "PLN", "GBP"] as const;

type ContractorRow = {
  contractorId: number;
  tmetricProjectId: string;
  costAmount: number;
  costCurrency: string;
  billingAmount: number;
  billingCurrency: string;
};

type ReportProjectEditor = {
  /** Stable React key; not the editable report project id. */
  editorKey: string;
  id: string;
  name: string;
  rows: ContractorRow[];
};

function newEditorKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ek_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function reportProjectEditorsWireEqual(
  a: ReportProjectEditor[],
  b: ReportProjectEditor[],
): boolean {
  const strip = (editors: ReportProjectEditor[]) =>
    editors.map(({ id, name, rows }) => ({ id, name, rows }));
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

function configToEditors(c: ProjectTmetricConfigurationV1): ReportProjectEditor[] {
  return c.projects.map((p) => ({
    editorKey: newEditorKey(),
    id: p.id,
    name: p.name,
    rows: Object.entries(p.contractors).map(([cid, b]) => {
      const cost = parseSimpleRate(b.costRate);
      const billing = parseSimpleRate(b.billingRate);
      return {
        contractorId: Number(cid),
        tmetricProjectId: b.tmetricProjectId,
        costAmount: cost.rate,
        costCurrency: cost.currency,
        billingAmount: billing.rate,
        billingCurrency: billing.currency,
      };
    }),
  }));
}

function editorsToConfig(
  editors: ReportProjectEditor[],
): ProjectTmetricConfigurationV1 {
  return {
    version: 1,
    projects: editors.map((e) => {
      const contractors: ProjectTmetricConfigurationV1["projects"][number]["contractors"] =
        {};
      for (const r of e.rows) {
        contractors[String(r.contractorId)] = {
          tmetricProjectId: r.tmetricProjectId.trim(),
          costRate: `${r.costAmount} ${r.costCurrency}`,
          billingRate: `${r.billingAmount} ${r.billingCurrency}`,
        };
      }
      return { id: e.id.trim(), name: e.name.trim(), contractors };
    }),
  };
}

function TmetricReportProjectCard(props: {
  contractorItems: Array<{ id: number; label: string }>;
  editor: ReportProjectEditor;
  index: number;
  setDirty: (dirty: boolean) => void;
  setProjects: Dispatch<SetStateAction<ReportProjectEditor[]>>;
}) {
  const { contractorItems, editor, index: pi, setDirty, setProjects } = props;
  const [localReportProjectId, setLocalReportProjectId] = useState(editor.id);

  useEffect(() => {
    setLocalReportProjectId(editor.id);
  }, [editor.id]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Report project id</Label>
            <Input
              value={localReportProjectId}
              onChange={(e) => {
                setLocalReportProjectId(e.target.value);
                setDirty(true);
              }}
              onBlur={() => {
                const next = localReportProjectId.trim();
                setProjects((p) =>
                  p.map((x, i) => (i === pi ? { ...x, id: next } : x)),
                );
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input
              value={editor.name}
              onChange={(e) => {
                const v = e.target.value;
                setProjects((p) =>
                  p.map((x, i) => (i === pi ? { ...x, name: v } : x)),
                );
                setDirty(true);
              }}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive self-start"
          onClick={() => {
            setProjects((p) => p.filter((_, i) => i !== pi));
            setDirty(true);
          }}
        >
          <Trash2 className="size-4 mr-1" />
          Remove project
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editor.rows.map((row, ri) => (
          <div
            key={`${editor.editorKey}-row-${ri}`}
            className="grid gap-3 p-3 border rounded-lg md:grid-cols-2 lg:grid-cols-6 items-end"
          >
            <div className="space-y-2 lg:col-span-1">
              <Label className="text-xs uppercase text-muted-foreground">
                Contractor
              </Label>
              <Select
                value={String(row.contractorId)}
                onValueChange={(v) => {
                  const id = Number(v);
                  setProjects((p) =>
                    p.map((pr, i) =>
                      i === pi
                        ? {
                            ...pr,
                            rows: pr.rows.map((rw, j) =>
                              j === ri ? { ...rw, contractorId: id } : rw,
                            ),
                          }
                        : pr,
                    ),
                  );
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {contractorItems.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label className="text-xs uppercase text-muted-foreground">
                TMetric project id
              </Label>
              <Input
                value={row.tmetricProjectId}
                onChange={(e) => {
                  const v = e.target.value;
                  setProjects((p) =>
                    p.map((pr, i) =>
                      i === pi
                        ? {
                            ...pr,
                            rows: pr.rows.map((rw, j) =>
                              j === ri ? { ...rw, tmetricProjectId: v } : rw,
                            ),
                          }
                        : pr,
                    ),
                  );
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Cost
              </Label>
              <NumberInput
                step={0.01}
                value={row.costAmount}
                onChange={(v) => {
                  setProjects((p) =>
                    p.map((pr, i) =>
                      i === pi
                        ? {
                            ...pr,
                            rows: pr.rows.map((rw, j) =>
                              j === ri ? { ...rw, costAmount: v } : rw,
                            ),
                          }
                        : pr,
                    ),
                  );
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                ccy
              </Label>
              <Select
                value={row.costCurrency}
                onValueChange={(v) => {
                  setProjects((p) =>
                    p.map((pr, i) =>
                      i === pi
                        ? {
                            ...pr,
                            rows: pr.rows.map((rw, j) =>
                              j === ri ? { ...rw, costCurrency: v } : rw,
                            ),
                          }
                        : pr,
                    ),
                  );
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Billing
              </Label>
              <NumberInput
                step={0.01}
                value={row.billingAmount}
                onChange={(v) => {
                  setProjects((p) =>
                    p.map((pr, i) =>
                      i === pi
                        ? {
                            ...pr,
                            rows: pr.rows.map((rw, j) =>
                              j === ri ? { ...rw, billingAmount: v } : rw,
                            ),
                          }
                        : pr,
                    ),
                  );
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-2 flex flex-col gap-2">
              <Label className="text-xs uppercase text-muted-foreground">
                ccy
              </Label>
              <div className="flex gap-2">
                <Select
                  value={row.billingCurrency}
                  onValueChange={(v) => {
                    setProjects((p) =>
                      p.map((pr, i) =>
                        i === pi
                          ? {
                              ...pr,
                              rows: pr.rows.map((rw, j) =>
                                j === ri ? { ...rw, billingCurrency: v } : rw,
                              ),
                            }
                          : pr,
                      ),
                    );
                    setDirty(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => {
                    setProjects((p) =>
                      p.map((pr, i) =>
                        i === pi
                          ? {
                              ...pr,
                              rows: pr.rows.filter((_, j) => j !== ri),
                            }
                          : pr,
                      ),
                    );
                    setDirty(true);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const first = contractorItems[0]?.id ?? 0;
            setProjects((p) =>
              p.map((pr, i) =>
                i === pi
                  ? {
                      ...pr,
                      rows: [
                        ...pr.rows,
                        {
                          contractorId: first,
                          tmetricProjectId: "",
                          costAmount: 0,
                          costCurrency: "EUR",
                          billingAmount: 0,
                          billingCurrency: "EUR",
                        },
                      ],
                    }
                  : pr,
              ),
            );
            setDirty(true);
          }}
          disabled={contractorItems.length === 0}
        >
          <Plus className="size-4 mr-1" />
          Add contractor row
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProjectTmetricMappingPanel(
  props: WithFrontServices & { projectId: Project["id"] },
) {
  const projectRd = props.services.projectService.useProject(props.projectId);
  const contractorsRd = props.services.projectService.useProjectContractors(
    maybe.of(props.projectId),
  );

  const contractorItems = useMemo(
    () =>
      rd.tryMap(contractorsRd, (list) =>
        list.map((pc) => ({
          id: pc.contractor.id,
          label: pc.contractor.fullName,
        })),
      ) ?? [],
    [contractorsRd],
  );

  return rd
    .journey(projectRd)
    .wait(<Skeleton className="h-48 w-full" />)
    .catch(renderError)
    .map((project) => (
      <ProjectTmetricMappingEditor
        key={project.id}
        services={props.services}
        project={project}
        contractorItems={contractorItems}
      />
    ));
}

function ProjectTmetricMappingEditor(
  props: WithFrontServices & {
    project: Project;
    contractorItems: Array<{ id: number; label: string }>;
  },
) {
  const scopeWorkspaceId = props.project.workspaceIds[0];
  const scopeClientId = props.project.clientId;
  const variableQuery = useMemo(
    () =>
      scopeWorkspaceId != null
        ? maybe.of(
            variableQueryUtils.ofDefault(scopeWorkspaceId, scopeClientId),
          )
        : maybe.ofAbsent(),
    [scopeWorkspaceId, scopeClientId],
  );
  const variablesRd = props.services.variableService.useVariables(variableQuery);

  const serverTmetricVariableValueRd = rd.useMemoMap(
    variablesRd,
    (list, projectId, wsId, clientId) => {
      if (wsId == null) return null;
      const row = findEffectiveProjectTmetricConfigurationVariable(list, {
        projectId,
        workspaceId: wsId,
        clientId,
      });
      return row?.value ?? null;
    },
    props.project.id,
    scopeWorkspaceId,
    scopeClientId,
  );

  const [projects, setProjects] = useState<ReportProjectEditor[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!rd.isSuccess(serverTmetricVariableValueRd)) return;
    if (dirty) return;
    const raw = serverTmetricVariableValueRd.data;
    const parsed = tryParseProjectTmetricConfiguration(raw);
    const nextEditors = parsed
      ? configToEditors(parsed)
      : configToEditors(emptyProjectTmetricConfigurationV1());
    setProjects((prev) => {
      if (reportProjectEditorsWireEqual(prev, nextEditors)) {
        return prev;
      }
      return nextEditors;
    });
  }, [serverTmetricVariableValueRd, dirty]);

  const saveMutation = promiseState.useMutation(
    async (rows: ReportProjectEditor[]) => {
      const ws = props.project.workspaceIds[0];
      if (ws == null) {
        toast.error(
          "Link this project to a workspace before saving TMetric mapping.",
        );
        return;
      }
      const config = editorsToConfig(rows);
      const validated = projectTmetricConfigurationV1Schema.safeParse(config);
      if (!validated.success) {
        toast.error(validated.error.message);
        return;
      }
      await persistProjectTmetricConfigurationVariable(
        props.services.variableService,
        {
          workspaceId: ws,
          clientId: props.project.clientId,
          projectId: props.project.id,
        },
        validated.data,
      );
      toast.success("TMetric mapping saved");
      setDirty(false);
    },
  );

  if (scopeWorkspaceId == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TMetric project mapping</CardTitle>
          <p className="text-sm text-muted-foreground">
            Link this project to at least one workspace to configure TMetric mapping
            (Environment variables are scoped by workspace and client).
          </p>
        </CardHeader>
      </Card>
    );
  }

  return rd
    .journey(variablesRd)
    .wait(<Skeleton className="h-48 w-full" />)
    .catch(renderError)
    .map(() => (
      <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">TMetric project mapping</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define report projects, TMetric project ids per contractor, and hourly
              cost and billing rates for this Tracker project. Imports require this
              mapping (explicit TMetric project ids and rates; no legacy name-based
              grouping). Values are stored as an Environment const variable{" "}
              <code className="text-xs">
                {projectTmetricConfigurationVariableName(props.project.id)}
              </code>{" "}
              for this workspace and client.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProjects((prev) => [
                  ...prev,
                  {
                    editorKey: newEditorKey(),
                    id: `project_${Date.now()}`,
                    name: "New project",
                    rows: [],
                  },
                ]);
                setDirty(true);
              }}
            >
              <Plus className="size-4 mr-1" />
              Add project
            </Button>
            <Button
              size="sm"
              disabled={!dirty || mt.isInProgress(saveMutation.state)}
              onClick={() => void saveMutation.track(projects)}
            >
              Save
            </Button>
          </div>
        </CardHeader>
      </Card>

      {projects.map((proj, pi) => (
        <TmetricReportProjectCard
          key={proj.editorKey}
          contractorItems={props.contractorItems}
          editor={proj}
          index={pi}
          setDirty={setDirty}
          setProjects={setProjects}
        />
      ))}
      </div>
    ));
}
