import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BranchConfigPage } from '@/pages/BranchConfigPage';
import { ScheduleConfigPage } from '@/pages/ScheduleConfigPage';
import { EmployeeManagementPage } from '@/pages/EmployeeManagementPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { FraudLogsPage } from '@/pages/FraudLogsPage';
import { useAuthStore } from '@/store/auth.store';

/**
 * ProtectedRoute: redirects to /login if not authenticated.
 * Used as a wrapper around all authenticated routes.
 */
function ProtectedRoute(): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * PublicOnlyRoute: redirects to / if already authenticated.
 * Used for the login page to avoid double-login.
 */
function PublicOnlyRoute(): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * Root app router.
 * All authenticated routes are wrapped in AppLayout which provides
 * the persistent sidebar + header.
 */
export function App(): JSX.Element {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/branches" element={<BranchConfigPage />} />
          <Route path="/schedules" element={<ScheduleConfigPage />} />
          <Route path="/employees" element={<EmployeeManagementPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/fraud" element={<FraudLogsPage />} />
        </Route>
      </Route>

      {/* Catch-all: redirect to dashboard (or login via ProtectedRoute) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
