import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from './auth/RequireAdmin';
import { AppShell } from './components/AppShell';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditPage } from './pages/AuditPage';
import { FeatureLabPage } from './pages/FeatureLabPage';
import { JobsPage } from './pages/JobsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OperationsPage } from './pages/OperationsPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReportsPage } from './pages/ReportsPage';
import { SignInPage } from './pages/SignInPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UsersPage } from './pages/UsersPage';
import { ZoneDetailPage } from './pages/ZoneDetailPage';
import { ZonesPage } from './pages/ZonesPage';

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="zones" element={<ZonesPage />} />
          <Route path="zones/:id" element={<ZoneDetailPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="lab" element={<FeatureLabPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
