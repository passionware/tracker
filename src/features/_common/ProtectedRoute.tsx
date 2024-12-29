import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/AuthService/AuthService.ts";
import { rd } from "@passionware/monads";
import { AlertCircle } from "lucide-react";
import { PropsWithChildren } from "react";

export function ProtectedRoute(
  props: PropsWithChildren<WithServices<[WithAuthService]>>,
) {
  const auth = props.services.authService.useAuth();
  return rd
    .journey(auth)
    .wait(
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
          <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
          <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-slate-100/50 md:min-h-min dark:bg-slate-800/50" />
      </div>,
    )
    .catch(() => (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Your session has expired. Please log in again.
        </AlertDescription>
      </Alert>
    ))
    .map(() => props.children);
}
