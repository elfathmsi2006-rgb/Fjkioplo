import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './app/AppProvider'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import type { Role } from './data/types'
import { canAccessPath } from './utils/permissions'
import ResetPasswordPage from './pages/ResetPasswordPage'

// Demo mode is opt-in for isolated UI previews only. Normal runs use backend authentication.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const MachinesPage = lazy(() => import('./pages/MachinesPage'))
const MachineDetailPage = lazy(() => import('./pages/MachineDetailPage'))
const WorkshopsPage = lazy(() => import('./pages/WorkshopsPage'))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const WarehousePage = lazy(() => import('./pages/WarehousePage'))
const ProductionPage = lazy(() => import('./pages/ProductionPage'))
const AuditTrailPage = lazy(() => import('./pages/AuditTrailPage'))
const OperationsHubPage = lazy(() => import('./pages/OperationsHubPage'))
const CopilotPage = lazy(() => import('./pages/CopilotPage'))
const HiddenFailuresPage = lazy(() => import('./pages/HiddenFailuresPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))

function RequireRole({
  allowed,
  children,
}: {
  allowed: Role[]
  children: ReactNode
}) {
  const { role } = useApp()
  const location = useLocation()

  // In demo mode, allow navigation without an account or assigned role.
  if (DEMO_MODE && !role) return children

  if (!role || !allowed.includes(role) || !canAccessPath(role, location.pathname)) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname, denied: true }}
      />
    )
  }

  return children
}

export default function App() {
  const {
    user,
    profile,
    authLoading,
    dataLoading,
    dataError,
    reloadData,
    isConfigured,
    role,
    signOut,
  } = useApp()

  const location = useLocation()

  // Skip authentication checks while previewing the frontend.
  if (!DEMO_MODE && authLoading) {
    return <LoadingScreen />
  }

  if (location.pathname === '/reset-password') {
    if (DEMO_MODE) {
      return <Navigate to="/" replace />
    }

    // Emailed reset links are opened while signed out, so this page must be
    // reachable without an existing session. The token is validated server-side.
    return <ResetPasswordPage />
  }

  if (!DEMO_MODE && (!isConfigured || !user)) {
    return <LoginPage />
  }

  if (!DEMO_MODE && (!profile || !role)) {
    return (
      <main className="login-page">
        <section className="login-card">
          <h1>Account access unavailable</h1>
          <p>
            Your account has no active profile. Ask the system administrator
            to activate it.
          </p>
          <button
            className="button button-primary"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </section>
      </main>
    )
  }

  if (!DEMO_MODE && dataLoading) {
    return <LoadingScreen />
  }

  if (!DEMO_MODE && dataError) {
    return (
      <main className="login-page">
        <section className="login-card">
          <h1>Database connection problem</h1>
          <p>{dataError}</p>
          <div className="form-actions">
            <button
              className="button button-primary"
              onClick={() => void reloadData()}
            >
              Retry
            </button>
            <button
              className="button button-secondary"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    )
  }

  const allRoles: Role[] = [
    'admin',
    'production_chief',
    'maintenance_worker',
    'workshop_head',
  ]

  const workshopRoles: Role[] = allRoles
  const managerRoles: Role[] = ['admin', 'production_chief', 'workshop_head']

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          <Route
            path="machines"
            element={
              <RequireRole allowed={allRoles}>
                <MachinesPage />
              </RequireRole>
            }
          />

          <Route
            path="machines/:id"
            element={
              <RequireRole allowed={allRoles}>
                <MachineDetailPage />
              </RequireRole>
            }
          />

          <Route
            path="workshops"
            element={
              <RequireRole allowed={workshopRoles}>
                <WorkshopsPage />
              </RequireRole>
            }
          />

          <Route path="operations" element={<RequireRole allowed={allRoles}><OperationsHubPage /></RequireRole>} />

          <Route path="copilot" element={<RequireRole allowed={managerRoles}><CopilotPage /></RequireRole>} />

          <Route path="hidden-failures" element={<RequireRole allowed={managerRoles}><HiddenFailuresPage /></RequireRole>} />

          <Route path="production" element={<RequireRole allowed={allRoles}><ProductionPage /></RequireRole>} />

          <Route
            path="maintenance"
            element={
              <RequireRole allowed={allRoles}>
                <MaintenancePage />
              </RequireRole>
            }
          />

          <Route
            path="warehouse"
            element={
              <RequireRole allowed={allRoles}>
                <WarehousePage />
              </RequireRole>
            }
          />

          <Route
            path="audit-trail"
            element={
              <RequireRole allowed={allRoles}>
                <AuditTrailPage />
              </RequireRole>
            }
          />

          <Route
            path="analytics"
            element={
              <RequireRole allowed={allRoles}>
                <AnalyticsPage />
              </RequireRole>
            }
          />

          <Route path="account" element={<RequireRole allowed={allRoles}><AccountPage /></RequireRole>} />

          <Route
            path="settings"
            element={
              <RequireRole allowed={['admin']}>
                <SettingsPage />
              </RequireRole>
            }
          />

          <Route
            path="users"
            element={
              <RequireRole allowed={['admin']}>
                <UsersPage />
              </RequireRole>
            }
          />

          <Route path="404" element={<NotFoundPage />} />

          <Route
            path="*"
            element={<Navigate to="/404" replace />}
          />
        </Route>
      </Routes>
    </Suspense>
  )
}
