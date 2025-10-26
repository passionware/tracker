import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithCockpitAuthService } from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { Building2, Home, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

type PortalType = "tracker" | "cockpit";

interface PortalAccessSectionProps
  extends WithServices<
    [WithAuthService, WithCockpitAuthService, WithRoutingService]
  > {
  currentPortal: PortalType;
  currentUserEmail?: string;
}

export function PortalAccessSection({
  services,
  currentPortal,
  currentUserEmail,
}: PortalAccessSectionProps) {
  const mainAppAuth = services.authService.useAuth();
  const cockpitAuth = services.cockpitAuthService.useAuth();

  const portals = [
    {
      type: "tracker" as const,
      name: "Main Tracker",
      icon: Home,
      auth: mainAppAuth,
      loginPath: "/login",
      navigatePath: services.routingService.forGlobal().root(),
      logout: services.authService.logout,
      color: "green",
    },
    {
      type: "cockpit" as const,
      name: "Client Cockpit",
      icon: Building2,
      auth: cockpitAuth,
      loginPath: services.routingService.forClientCockpit().login(),
      navigatePath: services.routingService.forClientCockpit().root(),
      logout: services.cockpitAuthService.logout,
      color: "blue",
    },
  ];

  // Sort to show current portal first
  const sortedPortals = portals.sort((a, b) =>
    a.type === currentPortal ? -1 : b.type === currentPortal ? 1 : 0,
  );

  return (
    <div className="px-3 py-2">
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        Portal Access
      </div>
      <div className="space-y-1.5">
        {sortedPortals.map((portal) => {
          const isCurrentPortal = portal.type === currentPortal;
          const Icon = portal.icon;
          const isTracker = portal.type === "tracker";

          // Current portal - always logged in
          if (isCurrentPortal) {
            return (
              <div
                key={portal.type}
                className={
                  isTracker
                    ? "px-2 py-1.5 rounded-md bg-green-50/50 border-2 border-green-300 relative group"
                    : "px-2 py-1.5 rounded-md bg-blue-50/50 border-2 border-blue-300 relative group"
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={
                      isTracker
                        ? "h-4 w-4 text-green-600"
                        : "h-4 w-4 text-blue-600"
                    }
                  />
                  <span className="text-sm font-medium flex-1">
                    {portal.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      portal.logout();
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                    title={`Logout from ${portal.name}`}
                  >
                    <LogOut className="h-3 w-3 text-red-600" />
                  </button>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                {currentUserEmail && (
                  <div
                    className={
                      isTracker
                        ? "text-xs text-green-700 ml-6 truncate"
                        : "text-xs text-blue-700 ml-6 truncate"
                    }
                  >
                    {currentUserEmail}
                  </div>
                )}
                <div
                  className={
                    isTracker
                      ? "text-xs text-green-600 ml-6 mt-0.5 font-medium"
                      : "text-xs text-blue-600 ml-6 mt-0.5 font-medium"
                  }
                >
                  Currently active
                </div>
              </div>
            );
          }

          // Other portal - check if logged in
          if (rd.isSuccess(portal.auth)) {
            return rd.tryMap(portal.auth, (authInfo) => {
              const isDifferentAccount =
                currentUserEmail &&
                maybe.map(
                  authInfo.email,
                  (email) => currentUserEmail !== email,
                ) !== false;

              return (
                <div key={portal.type} className="relative group">
                  <Link
                    to={portal.navigatePath}
                    className={
                      isTracker
                        ? "block px-2 py-1.5 rounded-md bg-green-50/50 border border-green-100 hover:bg-green-100/50 hover:border-green-200 transition-colors cursor-pointer"
                        : "block px-2 py-1.5 rounded-md bg-blue-50/50 border border-blue-100 hover:bg-blue-100/50 hover:border-blue-200 transition-colors cursor-pointer"
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={
                          isTracker
                            ? "h-4 w-4 text-green-600"
                            : "h-4 w-4 text-blue-600"
                        }
                      />
                      <span className="text-sm font-medium flex-1">
                        {portal.name}
                      </span>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          portal.logout();
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                        title={`Logout from ${portal.name}`}
                      >
                        <LogOut className="h-3 w-3 text-red-600" />
                      </button>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    {maybe.map(authInfo.email, (email) => (
                      <div
                        className={
                          isTracker
                            ? "text-xs text-green-700 ml-6 truncate"
                            : "text-xs text-blue-700 ml-6 truncate"
                        }
                      >
                        {email}
                      </div>
                    ))}
                    {isDifferentAccount && (
                      <div className="text-xs text-amber-600 ml-6 mt-0.5 flex items-center gap-1">
                        ⚠️ Different account
                      </div>
                    )}
                  </Link>
                </div>
              );
            });
          }

          // Not logged in
          return (
            <div
              key={portal.type}
              className="px-2 py-1.5 rounded-md bg-slate-50/50 border border-slate-100 relative group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="text-sm flex-1 text-muted-foreground">
                  {portal.name}
                </span>
                <XCircle className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xs text-slate-500 ml-6 mb-1">
                Not logged in
              </div>
              <Link
                to={portal.loginPath}
                className="ml-6 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                Login to {portal.type === "tracker" ? "Tracker" : "Cockpit"} →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
