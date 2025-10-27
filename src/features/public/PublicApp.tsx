import { PublicLayout } from "./PublicLayout.tsx";
import { ReportExplorer } from "./ReportExplorer.tsx";
import { Navigate, Route, Routes } from "react-router-dom";

export function PublicApp() {
  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/p/explorer" replace />} />
        <Route path="/explorer" element={<ReportExplorer />} />
        <Route path="/explorer/upload" element={<ReportExplorer />} />
        <Route path="/explorer/reports" element={<ReportExplorer />} />
      </Routes>
    </PublicLayout>
  );
}
