import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ErrorBoundary from './components/ErrorBoundary';
import NotFoundPage from './pages/NotFoundPage';

// ── Lazy-load all heavy pages for code splitting ───────────────────────────────
const DashboardPage         = lazy(() => import('./pages/dashboard/DashboardPage'));
const FrameworkPage         = lazy(() => import('./pages/framework/FrameworkPage'));
const MinisterialRFPage     = lazy(() => import('./pages/framework/MinisterialRFPage'));
const FrameworkVersionsPage = lazy(() => import('./pages/framework/FrameworkVersionsPage'));
const IndicatorsPage        = lazy(() => import('./pages/indicators/IndicatorsPage'));
const IndicatorDetailPage   = lazy(() => import('./pages/indicators/IndicatorDetailPage'));
const NewIndicatorPage      = lazy(() => import('./pages/indicators/NewIndicatorPage'));
const DataEntryPage         = lazy(() => import('./pages/data-entry/DataEntryPage'));
const SubmitDataPage        = lazy(() => import('./pages/data-entry/SubmitDataPage'));
const IndustryStatsPage     = lazy(() => import('./pages/data-entry/IndustryStatsPage'));
const ApprovalQueuePage     = lazy(() => import('./pages/data-entry/ApprovalQueuePage'));
const SubmissionDetailPage  = lazy(() => import('./pages/data-entry/SubmissionDetailPage'));
const BudgetPage            = lazy(() => import('./pages/budget/BudgetPage'));
const BudgetPlanPage        = lazy(() => import('./pages/budget/BudgetPlanPage'));
const ExpenditurePage       = lazy(() => import('./pages/budget/ExpenditurePage'));
const ReportsPage           = lazy(() => import('./pages/reports/ReportsPage'));
const AnalyticsPage         = lazy(() => import('./pages/analytics/AnalyticsPage'));
const ProjectsPage          = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage     = lazy(() => import('./pages/projects/ProjectDetailPage'));
const ProjectFormPage       = lazy(() => import('./pages/projects/ProjectFormPage'));
const DocumentsPage         = lazy(() => import('./pages/documents/DocumentsPage'));
const HelpPage              = lazy(() => import('./pages/help/HelpPage'));
const InstitutionsPage      = lazy(() => import('./pages/admin/InstitutionsPage'));
const MITPage               = lazy(() => import('./pages/admin/MITPage'));
const UsersPage             = lazy(() => import('./pages/admin/UsersPage'));
const IntegrationsPage      = lazy(() => import('./pages/admin/IntegrationsPage'));
const ReportingCalendarPage = lazy(() => import('./pages/admin/ReportingCalendarPage'));
const PeriodLocksPage       = lazy(() => import('./pages/admin/PeriodLocksPage'));
const WorkplanPage          = lazy(() => import('./pages/workplan/WorkplanPage'));
const HelpdeskPage          = lazy(() => import('./pages/helpdesk/HelpdeskPage'));

// ── Page loading skeleton ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded-xl w-48" />
          <div className="h-4 bg-gray-100 rounded w-64" />
        </div>
        <div className="h-10 bg-gray-200 rounded-xl w-28" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl border border-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-gray-100 rounded-2xl border border-gray-200" />
        <div className="h-64 bg-gray-100 rounded-2xl border border-gray-200" />
      </div>
    </div>
  );
}

// ── Auth guards ────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const user = useAuthStore(s => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Per-page wrapper: error boundary + suspense ────────────────────────────────
function Page({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected app shell */}
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<Page><DashboardPage /></Page>} />

          {/* Results Framework */}
          <Route path="framework" element={<Navigate to="/framework/ministerial" replace />} />
          <Route path="framework/edit"        element={<Page><FrameworkPage /></Page>} />
          <Route path="framework/ministerial" element={<Page><MinisterialRFPage /></Page>} />
          <Route path="framework/versions"    element={
            <RequireRole roles={['super_admin', 'admin', 'me_officer']}>
              <Page><FrameworkVersionsPage /></Page>
            </RequireRole>
          } />

          {/* Indicators */}
          <Route path="indicators"     element={<Page><IndicatorsPage /></Page>} />
          <Route path="indicators/new" element={
            <RequireRole roles={['super_admin', 'me_officer']}>
              <Page><NewIndicatorPage /></Page>
            </RequireRole>
          } />
          <Route path="indicators/:id" element={<Page><IndicatorDetailPage /></Page>} />

          {/* Data Entry */}
          <Route path="data-entry"                     element={<Page><DataEntryPage /></Page>} />
          <Route path="data-entry/submit"              element={<Page><SubmitDataPage /></Page>} />
          <Route path="data-entry/industry-statistics" element={<Page><IndustryStatsPage /></Page>} />
          <Route path="data-entry/approval-queue"      element={
            <RequireRole roles={['super_admin', 'admin', 'me_officer']}>
              <Page><ApprovalQueuePage /></Page>
            </RequireRole>
          } />
          <Route path="data-entry/submissions/:id" element={<Page><SubmissionDetailPage /></Page>} />

          {/* Projects */}
          <Route path="projects"          element={<Page><ProjectsPage /></Page>} />
          <Route path="projects/new"      element={<Page><ProjectFormPage /></Page>} />
          <Route path="projects/:id"      element={<Page><ProjectDetailPage /></Page>} />
          <Route path="projects/:id/edit" element={<Page><ProjectFormPage /></Page>} />

          {/* Budget */}
          <Route path="budget"              element={<Page><BudgetPage /></Page>} />
          <Route path="budget/plan"         element={<Page><BudgetPlanPage /></Page>} />
          <Route path="budget/expenditures" element={<Page><ExpenditurePage /></Page>} />

          {/* Reports & Analytics */}
          <Route path="reports"   element={<Page><ReportsPage /></Page>} />
          <Route path="analytics" element={<Page><AnalyticsPage /></Page>} />

          {/* Documents */}
          <Route path="documents" element={<Page><DocumentsPage /></Page>} />

          {/* Workplan */}
          <Route path="workplan" element={<Page><WorkplanPage /></Page>} />

          {/* Helpdesk */}
          <Route path="helpdesk" element={<Page><HelpdeskPage /></Page>} />

          {/* Help */}
          <Route path="help" element={<Page><HelpPage /></Page>} />

          {/* Admin */}
          <Route path="admin/mit" element={
            <RequireRole roles={['super_admin', 'admin', 'me_officer']}>
              <Page><MITPage /></Page>
            </RequireRole>
          } />
          <Route path="admin/institutions" element={
            <RequireRole roles={['super_admin', 'admin']}>
              <Page><InstitutionsPage /></Page>
            </RequireRole>
          } />
          <Route path="admin/users" element={
            <RequireRole roles={['super_admin', 'admin']}>
              <Page><UsersPage /></Page>
            </RequireRole>
          } />
          <Route path="admin/integrations" element={
            <RequireRole roles={['super_admin', 'admin', 'me_officer']}>
              <Page><IntegrationsPage /></Page>
            </RequireRole>
          } />
          <Route path="admin/calendar" element={
            <RequireRole roles={['super_admin', 'admin', 'me_officer', 'data_collector', 'viewer']}>
              <Page><ReportingCalendarPage /></Page>
            </RequireRole>
          } />
          <Route path="admin/period-locks" element={
            <RequireRole roles={['super_admin', 'admin', 'me_officer', 'data_collector', 'viewer']}>
              <Page><PeriodLocksPage /></Page>
            </RequireRole>
          } />

          {/* 404 inside app shell */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Public 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
