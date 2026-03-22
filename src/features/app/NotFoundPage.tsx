import { Button } from "@/components/ui/button.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { myRouting } from "@/routing/myRouting.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Layout } from "@/layout/AppLayout.tsx";
import { rd } from "@passionware/monads";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function NotFoundScreen(props: {
  layout?: "fullscreen" | "inset";
  actions: ReactNode;
}) {
  const { layout = "fullscreen", actions } = props;
  const isFullscreen = layout === "fullscreen";

  return (
    <div
      className={
        isFullscreen
          ? "relative isolate flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-16"
          : "relative isolate flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-12"
      }
    >
      <div
        aria-hidden
        className={
          isFullscreen
            ? "pointer-events-none absolute inset-0 -z-10 opacity-90 dark:opacity-80"
            : "pointer-events-none absolute inset-0 -z-10 opacity-50 dark:opacity-45"
        }
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-primary/[0.07] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-chart-4/15 via-transparent to-chart-2/10" />
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-transparent to-chart-1/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-background" />
      </div>

      <div
        className={
          isFullscreen
            ? "relative w-full max-w-lg text-center"
            : "relative w-full max-w-md text-center"
        }
      >
        <p className="font-mono text-xs font-medium tracking-[0.35em] text-muted-foreground uppercase">
          Error 404
        </p>
        <h1 className="mt-3 bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl tabular-nums">
          Not found
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          This URL does not match anything in the app. It may have been moved,
          mistyped, or the link is out of date.
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          {actions}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </div>
  );
}

export function NotFoundActionsMainApp(props: WithFrontServices) {
  const auth = props.services.authService.useAuth();
  return rd
    .journey(auth)
    .wait(
      <Button variant="secondary" disabled className="min-w-[9rem]">
        Loading…
      </Button>,
    )
    .catch(() => (
      <>
        <Button asChild className="min-w-[9rem]">
          <Link to="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline" className="min-w-[9rem]">
          <Link to="/p/explorer">Report explorer</Link>
        </Button>
      </>
    ))
    .map(() => (
      <>
        <Button asChild className="min-w-[9rem]">
          <Link
            to={myRouting
              .forWorkspace(idSpecUtils.ofAll())
              .forClient(idSpecUtils.ofAll())
              .tmetricDashboard()}
          >
            Back to app
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-w-[9rem]">
          <Link to="/">Home</Link>
        </Button>
      </>
    ));
}

function NotFoundPageFullscreen(props: WithFrontServices) {
  return (
    <NotFoundScreen
      layout="fullscreen"
      actions={<NotFoundActionsMainApp services={props.services} />}
    />
  );
}

function NotFoundPageWithSidebar(props: WithFrontServices) {
  return (
    <Layout sidebarSlot={<AppSidebar services={props.services} />}>
      <NotFoundScreen
        layout="inset"
        actions={<NotFoundActionsMainApp services={props.services} />}
      />
    </Layout>
  );
}

/**
 * Main app 404: sidebar + chrome when signed in; fullscreen when signed out
 * (so guests still see a real 404 instead of the login gate).
 */
export function NotFoundPage(props: WithFrontServices) {
  const auth = props.services.authService.useAuth();
  return rd
    .journey(auth)
    .wait(
      <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>,
    )
    .catch(() => <NotFoundPageFullscreen services={props.services} />)
    .map(() => <NotFoundPageWithSidebar services={props.services} />);
}

export function NotFoundActionsPublic() {
  return (
    <Button asChild className="min-w-[9rem]">
      <Link to="/p/explorer">Back to explorer</Link>
    </Button>
  );
}

export function NotFoundActionsCockpit(props: WithFrontServices) {
  const auth = props.services.cockpitAuthService.useAuth();
  return rd
    .journey(auth)
    .wait(
      <Button variant="secondary" disabled className="min-w-[9rem]">
        Loading…
      </Button>,
    )
    .catch(() => (
      <Button asChild className="min-w-[9rem]">
        <Link to={myRouting.forClientCockpit().login()}>Cockpit sign in</Link>
      </Button>
    ))
    .map((info) => (
      <>
        <Button asChild className="min-w-[9rem]">
          <Link
            to={myRouting
              .forClientCockpit()
              .forClient(info.tenantId)
              .reports()}
          >
            Back to reports
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-w-[9rem]">
          <Link to={myRouting.forClientCockpit().root()}>Cockpit home</Link>
        </Button>
      </>
    ));
}
