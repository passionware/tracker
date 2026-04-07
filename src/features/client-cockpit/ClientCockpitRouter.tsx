import { myRouting } from "@/routing/myRouting.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { CockpitLoginPage } from "./CockpitLoginPage";
import { CockpitPortalClientSettingsPage } from "./pages/CockpitPortalClientSettingsPage";
import { CockpitPortalProviderSettingsPage } from "./pages/CockpitPortalProviderSettingsPage";
import { CubeReportsPage } from "./pages/CubeReportsPage";
import { CubeViewerPage } from "./pages/CubeViewerPage";
import { PdfExportBuilderPage } from "./pages/PdfExportBuilderPage";
import { ProtectedCockpitRoute } from "./ProtectedCockpitRoute";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import { rd } from "@passionware/monads";
import { Layout } from "@/layout/AppLayout.tsx";
import { CockpitSidebar } from "./CockpitSidebar";
import {
  NotFoundActionsCockpit,
  NotFoundScreen,
} from "@/features/app/NotFoundPage.tsx";

/**
 * Main cockpit router - simple like main app
 */
export function CockpitMainRouter(props: WithFrontServices) {
  const authState = props.services.cockpitAuthService.useAuth();
  const basePath = myRouting.forClientCockpit().root();

  console.log("authState", authState);

  return (
    <Routes>
      {/* Login route - accessible to anyone */}
      <Route
        path={makeRelativePath(
          basePath,
          myRouting.forClientCockpit().login(),
        )}
        element={<CockpitLoginPage services={props.services} />}
      />

      <Route
        path={makeRelativePath(
          basePath,
          myRouting.forClientCockpit().forClient().portalClientSettings(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <CockpitPortalClientSettingsPage services={props.services} />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />
      <Route
        path={makeRelativePath(
          basePath,
          myRouting.forClientCockpit().forClient().portalProviderSettings(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <CockpitPortalProviderSettingsPage services={props.services} />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />
      <Route
        path={makeRelativePath(
          basePath,
          myRouting.forClientCockpit().forClient().tenantSettings(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <CockpitSettingsIndexRedirect />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />

      <Route
        path={makeRelativePath(
          basePath,
          myRouting
            .forClientCockpit()
            .forClient()
            .reports(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <CubeReportsPage services={props.services} />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />

      {/* Cube Viewer Route */}
      <Route
        path={makeRelativePath(
          basePath,
          myRouting
            .forClientCockpit()
            .forClient()
            .forReport()
            .cubeViewer(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <CubeViewerPage services={props.services} />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />

      {/* PDF Export Builder Route */}
      <Route
        path={makeRelativePath(
          basePath,
          myRouting
            .forClientCockpit()
            .forClient()
            .forReport()
            .pdfExportBuilder(),
        )}
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <PdfExportBuilderPage services={props.services} />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />

      <Route
        path=""
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <RedirectFromRoot services={props.services} />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />

      <Route
        path="*"
        element={
          <ProtectedCockpitRoute services={props.services}>
            <Layout sidebarSlot={<CockpitSidebar services={props.services} />}>
              <NotFoundScreen
                layout="inset"
                actions={<NotFoundActionsCockpit services={props.services} />}
              />
            </Layout>
          </ProtectedCockpitRoute>
        }
      />
    </Routes>
  );
}

function CockpitSettingsIndexRedirect() {
  const { clientId } = useParams<{ clientId: string }>();
  if (!clientId) return null;
  return (
    <Navigate
      replace
      to={myRouting
        .forClientCockpit()
        .forClient(clientId)
        .portalClientSettings()}
    />
  );
}

function RedirectFromRoot(props: WithFrontServices) {
  const authState = props.services.cockpitAuthService.useAuth();
  return rd.tryMap(authState, (authInfo) => {
    return (
      <Navigate
        replace
        to={myRouting
          .forClientCockpit()
          .forClient(authInfo.tenantId!)
          .reports()}
      />
    );
  });
}
