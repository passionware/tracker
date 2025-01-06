import { LoginForm } from "@/features/app/login-form.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";

export function LoginPage(
  props: WithServices<
    [WithAuthService, WithRoutingService, WithNavigationService]
  >,
) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-100 p-6 md:p-10 dark:bg-slate-800">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm services={props.services} />
      </div>
    </div>
  );
}
