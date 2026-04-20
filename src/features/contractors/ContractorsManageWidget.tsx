import { Contractor, contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { deriveAdminScope } from "@/features/time-tracking/TimeTrackingApprovalsPage.tsx";
import { cn } from "@/lib/utils.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { rd } from "@passionware/monads";
import { Check, ChevronsUpDown, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Admin-only page for pairing contractor rows with Supabase auth users.
 *
 * The underlying column (`contractor.user_id` → `auth.users.id`) has
 * existed since the production schema mirror, but the app had no UI to
 * maintain it — "Assign me" and similar user-level questions fell back
 * to the tracker bar's "track as" override. This page is the source of
 * truth for that mapping so those fallbacks can retire.
 *
 * Gating: server-side via `set_contractor_user` / `list_auth_user_directory`
 * RPCs (both require `role = 'super_admin'`). We also gate the page
 * client-side on the same predicate so non-admins see a clear "not
 * authorised" state rather than silent RPC failures.
 */
export function ContractorsManageWidget(props: WithFrontServices) {
  const auth = props.services.authService.useAuth();
  const userId = rd.tryGet(auth)?.id ?? null;
  const rolesRd = props.services.timeRoleService.useMyRoles(userId);

  return (
    <CommonPageContainer
      segments={[
        <BreadcrumbPage>Configuration</BreadcrumbPage>,
        <BreadcrumbPage>Contractors</BreadcrumbPage>,
      ]}
    >
      {rd
        .journey(rolesRd)
        .wait(<Skeleton className="h-64 w-full" />)
        .catch(renderError)
        .map((roles) => {
          const scope = deriveAdminScope(roles);
          if (scope.kind !== "super_admin" || userId === null) {
            return <NotAuthorisedCard />;
          }
          return <ContractorsTable services={props.services} />;
        })}
    </CommonPageContainer>
  );
}

function NotAuthorisedCard() {
  return (
    <Card className="max-w-xl">
      <CardHeader className="flex flex-row items-center gap-2">
        <ShieldAlert className="size-5 text-amber-600" />
        <CardTitle>Not authorised</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Only <code>super_admin</code> accounts can edit contractor ↔ user
        mappings. Ask an admin to grant your account a{" "}
        <code>super_admin</code> grant in the <code>role</code> table.
      </CardContent>
    </Card>
  );
}

function ContractorsTable(props: WithFrontServices) {
  const contractorsRd = props.services.contractorService.useContractors(
    contractorQueryUtils.ofEmpty(),
  );
  // Keep the directory fetch enabled unconditionally — the page is
  // already super_admin-gated, so the RPC will succeed; prefetching
  // means the per-row picker opens instantly.
  const directoryRd =
    props.services.contractorService.useAuthUserDirectory(true);
  const directory = rd.tryGet(directoryRd) ?? [];
  const directoryById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const d of directory) m.set(d.id, d.email);
    return m;
  }, [directory]);

  return rd
    .journey(contractorsRd)
    .wait(<Skeleton className="h-64 w-full" />)
    .catch(renderError)
    .map((contractors) => (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Contractor ↔ login mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Contractor</TableHead>
                <TableHead className="w-[60%]">Linked login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((contractor) => (
                <TableRow key={contractor.id}>
                  <TableCell className="font-medium">
                    <div>{contractor.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {contractor.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LinkedUserCell
                      services={props.services}
                      contractor={contractor}
                      directory={directory}
                      directoryEmail={
                        contractor.authUserId
                          ? directoryById.get(contractor.authUserId) ?? null
                          : null
                      }
                      directoryLoading={!rd.isSuccess(directoryRd)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {contractors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No contractors yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ));
}

function LinkedUserCell(
  props: WithFrontServices & {
    contractor: Contractor;
    directory: { id: string; email: string | null }[];
    directoryEmail: string | null;
    directoryLoading: boolean;
  },
) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.directory;
    return props.directory.filter((u) =>
      (u.email ?? u.id).toLowerCase().includes(q),
    );
  }, [props.directory, query]);

  const apply = async (authUserId: string | null) => {
    setSubmitting(true);
    try {
      await props.services.contractorService.setContractorAuthUser({
        contractorId: props.contractor.id,
        authUserId,
      });
      toast.success(
        authUserId
          ? `Linked ${props.contractor.fullName} to a login`
          : `Unlinked ${props.contractor.fullName}`,
      );
      setOpen(false);
    } catch (e) {
      toast.error(
        // Surface the PostgREST error verbatim — partial-unique violations
        // (one-user-one-contractor) look like '23505', which is actionable
        // information for the admin.
        `Couldn't update mapping: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentLabel = props.contractor.authUserId
    ? props.directoryEmail ?? props.contractor.authUserId
    : "— not linked —";

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            size="sm"
            aria-expanded={open}
            disabled={submitting}
            className="h-8 max-w-[420px] justify-between gap-2 font-normal"
          >
            <span
              className={cn(
                "truncate",
                !props.contractor.authUserId && "text-muted-foreground",
              )}
            >
              {currentLabel}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by email…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {props.directoryLoading
                  ? "Loading users…"
                  : "No users match."}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((user) => {
                  const selected =
                    props.contractor.authUserId === user.id;
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => apply(user.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {user.email ?? user.id}
                      </span>
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {props.contractor.authUserId ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => apply(null)}
          disabled={submitting}
          aria-label="Unlink login"
          title="Unlink login"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
