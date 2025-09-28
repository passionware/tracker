import { Button } from "@/components/ui/button.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { rd } from "@passionware/monads";
import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

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
              <Link to="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    ))
    .map(() => props.children);
}

export function RenderIfAuthenticated(
  props: PropsWithChildren<WithServices<[WithAuthService]>>,
) {
  const auth = props.services.authService.useAuth();
  return rd
    .journey(auth)
    .wait(null)
    .catch(() => null)
    .map(() => props.children);
}
