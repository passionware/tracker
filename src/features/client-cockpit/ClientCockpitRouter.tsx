import { WithFrontServices } from "@/core/frontServices.ts";
import { Navigate, Route, Routes } from "react-router-dom";
import { CockpitLoginPage } from "./CockpitLoginPage";
import { CubeReportsPage } from "./pages/CubeReportsPage";
import { ProtectedCockpitRoute } from "./ProtectedCockpitRoute";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import { rd } from "@passionware/monads";

/**
 * Main cockpit router - simple like main app
 */
export function CockpitMainRouter(props: WithFrontServices) {
  const authState = props.services.cockpitAuthService.useAuth();
  const basePath = props.services.routingService.forClientCockpit().root();

  console.log("authState", authState);

  return (
    <Routes>
      {/* Login route - accessible to anyone */}
      <Route
        path={makeRelativePath(
          basePath,
          props.services.routingService.forClientCockpit().login(),
        )}
        element={<CockpitLoginPage services={props.services} />}
      />

      <Route
        path={makeRelativePath(
          basePath,
          props.services.routingService
            .forClientCockpit()
            .forClient()
            .reports(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <CubeReportsPage services={props.services} />
          </ProtectedCockpitRoute>
        }
      />
      <Route
        path=""
        element={
          <ProtectedCockpitRoute services={props.services}>
            <RedirectFromRoot services={props.services} />
          </ProtectedCockpitRoute>
        }
      />
    </Routes>
  );
}

function RedirectFromRoot(props: WithFrontServices) {
  const authState = props.services.cockpitAuthService.useAuth();
  return rd.tryMap(authState, (authInfo) => {
    return (
      <Navigate
        to={props.services.routingService
          .forClientCockpit()
          .forClient(authInfo.tenantId!)
          .reports()}
      />
    );
  });
}
