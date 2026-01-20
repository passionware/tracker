import { WithFrontServices } from "@/core/frontServices.ts";
import { PublicLayout } from "./PublicLayout.tsx";
import { ReportExplorer } from "./ReportExplorer.tsx";
import { Navigate, Route, Routes } from "react-router-dom";

export function PublicApp(props: WithFrontServices) {
  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/p/explorer" replace />} />
        <Route
          path="/explorer"
          element={<ReportExplorer services={props.services} />}
        />
        <Route
          path="/explorer/upload"
          element={<ReportExplorer services={props.services} />}
        />
        <Route
          path="/explorer/reports"
          element={<ReportExplorer services={props.services} />}
        />
      </Routes>
    </PublicLayout>
  );
}
