import { myRouting } from "@/routing/myRouting.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { rd } from "@passionware/monads";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function usePortalTenantSources(props: WithFrontServices) {
  const navigate = useNavigate();
  const authState = props.services.cockpitAuthService.useAuth();
  const tenantId = rd.mapOrElse(authState, (a) => a.tenantId, null);
  const isAdmin = rd.tryGet(authState)?.role === "admin";
  const tenantRd = props.services.cockpitTenantService.useTenant(tenantId);
  const clientId = rd.tryMap(tenantRd, (t) => t.clientId) ?? null;
  const mainWorkspacesRd =
    props.services.workspaceService.useWorkspacesForClient(clientId);
  const mainClientRd = props.services.clientService.useClient(clientId);

  const handleBack = () => {
    if (tenantId) {
      navigate(myRouting.forClientCockpit().forClient(tenantId).reports());
    }
  };

  return {
    tenantId,
    isAdmin,
    tenantRd,
    clientId,
    mainWorkspacesRd,
    mainClientRd,
    handleBack,
  };
}

export function PortalSettingsAccessDenied(props: {
  onBack: () => void;
}) {
  return (
    <div className="p-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Portal settings</CardTitle>
          <CardDescription>
            Only cockpit administrators can open portal settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={props.onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to reports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function PortalSettingsPageSkeleton() {
  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
