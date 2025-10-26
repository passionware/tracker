import { Button } from "@/components/ui/button";
import { WithFrontServices } from "@/core/frontServices.ts";
import { rd } from "@passionware/monads";
import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

interface ProtectedCockpitRouteProps extends WithFrontServices {
  children: React.ReactNode;
}

export function ProtectedCockpitRoute({
  children,
  services,
}: PropsWithChildren<ProtectedCockpitRouteProps>) {
  const authState = services.cockpitAuthService.useAuth();

  return rd
    .journey(authState)
    .wait(
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
          <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
          <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
        </div>
        <div className="min-h-screen flex-1 rounded-xl bg-slate-100/50 md:min-h-min dark:bg-slate-800/50" />
      </div>,
    )
    .catch(() => (
      <div className="h-screen w-screen flex flex-row items-center justify-center bg-slate-100">
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
          <div className="text-center">
            <h1 className="text-2xl font-medium mb-4">
              You are not currently logged in
            </h1>
            <Button asChild>
              <Link to={services.routingService.forClientCockpit().login()}>
                Go to Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    ))
    .map(() => children);
}
