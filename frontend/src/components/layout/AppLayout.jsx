import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon, ChartBarIcon, DocumentTextIcon, ClipboardDocumentListIcon,
  BuildingOfficeIcon, UsersIcon, CurrencyDollarIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, BuildingLibraryIcon,
  BuildingStorefrontIcon, BriefcaseIcon, ArrowsRightLeftIcon, LockClosedIcon,
  CalendarDaysIcon, FolderOpenIcon, SparklesIcon,
  ArchiveBoxIcon, CheckBadgeIcon, TableCellsIcon,
  LightBulbIcon,
  ChartPieIcon, ClipboardDocumentCheckIcon,
  BanknotesIcon, EnvelopeIcon, ClipboardDocumentIcon,
  ShieldCheckIcon, ServerStackIcon, ArrowUpTrayIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronRightIcon, UserPlusIcon,
  LifebuoyIcon, BellAlertIcon, SunIcon, MoonIcon, ComputerDesktopIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import useThemeStore from '../../store/themeStore';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import { authApi, userRequestsApi } from '../../api';
import { useSocketAuth, useSocketEvent } from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../ChangePasswordModal';
import NotificationBell from '../NotificationBell';
import SessionTimer from '../SessionTimer';
import NetworkStatus from '../NetworkStatus';

// ── Navigation items per role ─────────────────────────────────────────────────
// These are the BASE definitions; role filtering happens in the component.

const mainNavAll = [
  { name: 'Dashboard',           href: '/dashboard',                      icon: HomeIcon,              roles: ['all'] },
  { name: 'Results Framework',   href: '/framework/ministerial',          icon: BuildingLibraryIcon,   roles: ['all'] },
  { name: 'Theory of Change',    href: '/framework/toc',                  icon: LightBulbIcon,         roles: ['super_admin','admin','me_officer','data_collector'] },
  { name: 'Indicators',          href: '/indicators',                     icon: ChartBarIcon,          roles: ['super_admin','admin','me_officer'] },
];

const dataNavAll = [
  { name: 'Data Entry',          href: '/data-entry',                     icon: ClipboardDocumentListIcon, roles: ['all'] },
  { name: 'Bulk Import',         href: '/data-entry/import',              icon: ArrowUpTrayIcon,           roles: ['super_admin','admin','me_officer','data_collector'] },
  { name: 'Approval Queue',      href: '/data-entry/approval-queue',      icon: CheckBadgeIcon,            roles: ['super_admin','admin','me_officer'] },
  { name: 'Industry Statistics', href: '/data-entry/industry-statistics', icon: BuildingStorefrontIcon,    roles: ['super_admin','admin','me_officer'] },
  { name: 'Projects',            href: '/projects',                       icon: BriefcaseIcon,             roles: ['super_admin','admin','me_officer','data_collector'] },
  { name: 'Activity Workplan',   href: '/workplan',                       icon: TableCellsIcon,            roles: ['super_admin','admin','me_officer','data_collector'] },
  { name: 'Budget',              href: '/budget',                         icon: CurrencyDollarIcon,        roles: ['super_admin','admin','me_officer'] },
  { name: 'MTEF',                href: '/budget/mtef',                    icon: BanknotesIcon,             roles: ['super_admin','admin','me_officer'] },
];

// All items inside the collapsible Reports group
const reportsChildrenAll = [
  { name: 'Reports',             href: '/reports',                        icon: DocumentTextIcon,          roles: ['all'] },
  { name: 'Analytics',           href: '/analytics',                      icon: SparklesIcon,              roles: ['super_admin','admin','me_officer'] },
  { name: 'SWOT Analysis',       href: '/analytics/swot',                 icon: ViewColumnsIcon,           roles: ['super_admin','admin','me_officer'] },
  { name: 'Insights',            href: '/insights',                       icon: BellAlertIcon,             roles: ['super_admin','admin','me_officer'] },
  { name: 'AI Assistant',        href: '/insights/ai',                    icon: CpuChipIcon,               roles: ['super_admin','admin','me_officer'] },
  { name: 'Completeness',        href: '/data-entry/completeness',        icon: ChartPieIcon,              roles: ['super_admin','admin','me_officer'] },
  { name: 'Documents',           href: '/documents',                      icon: FolderOpenIcon,            roles: ['all'] },
  { name: 'Custom Forms',        href: '/forms',                          icon: ClipboardDocumentIcon,     roles: ['all'] },
  { name: 'Helpdesk',            href: '/helpdesk',                       icon: LifebuoyIcon,              roles: ['all'] },
];

const reportsAdminChildren = [
  { name: 'Audit Logs',          href: '/admin/audit-logs',               icon: ClipboardDocumentCheckIcon },
  { name: 'FW Versions',         href: '/framework/versions',             icon: ArchiveBoxIcon },
  { name: 'Email Reports',       href: '/admin/email-reports',            icon: EnvelopeIcon },
];

const adminNav = [
  { name: 'MIT',                 href: '/admin/mit',                      icon: BuildingLibraryIcon },
  { name: 'Institutions',        href: '/admin/institutions',             icon: BuildingOfficeIcon },
  { name: 'Users',               href: '/admin/users',                    icon: UsersIcon },
  { name: 'Account Requests',    href: '/admin/user-requests',            icon: UserPlusIcon, badge: true },
  { name: 'Integrations',        href: '/admin/integrations',             icon: ArrowsRightLeftIcon },
  { name: 'Ext. Systems',        href: '/admin/integrations-ext',         icon: ServerStackIcon },
  { name: 'Calendar',            href: '/admin/calendar',                 icon: CalendarDaysIcon },
  { name: 'Period Locks',        href: '/admin/period-locks',             icon: LockClosedIcon },
];

// Helper to filter nav items by role
function filterByRole(items, role) {
  return items.filter(item => item.roles?.includes('all') || item.roles?.includes(role));
}

// Paths that belong to the Reports group — used to auto-open it
const REPORTS_PATHS = [
  '/reports', '/analytics', '/documents', '/forms',
  '/data-entry/completeness', '/admin/audit-logs',
  '/framework/versions', '/admin/email-reports',
  '/insights', '/insights/ai', '/helpdesk',
];

// Legacy arrays (kept for REPORTS_PATHS and CollapsibleReports compatibility)
const mainNav = mainNavAll;
const dataNav = dataNavAll;
const reportsChildren = reportsChildrenAll;

function NavLink2({ item, badgeCount }) {
  return (
    <NavLink to={item.href}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`
      }>
      <item.icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{item.name}</span>
      {item.badge && badgeCount > 0 && (
        <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </NavLink>
  );
}

function NavSection({ items, requestCount = 0 }) {
  return items.map(item => <NavLink2 key={item.name} item={item} badgeCount={requestCount} />);
}

function SectionLabel({ label }) {
  return (
    <div className="pt-4 pb-1 px-3 text-xs font-semibold text-blue-400 uppercase tracking-wider">
      {label}
    </div>
  );
}

function CollapsibleReports({ canAdmin, currentPath, userRole }) {
  // Auto-open if any child route is active
  const isChildActive = REPORTS_PATHS.some(p => currentPath.startsWith(p));
  const [open, setOpen] = useState(isChildActive);

  const filteredReports = filterByRole(reportsChildren, userRole);
  const children = canAdmin
    ? [...filteredReports, ...reportsAdminChildren]
    : filteredReports;

  return (
    <div>
      {/* Accordion trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          ${isChildActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}
      >
        <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">Reports</span>
        {open
          ? <ChevronDownIcon className="w-4 h-4 flex-shrink-0 opacity-70" />
          : <ChevronRightIcon className="w-4 h-4 flex-shrink-0 opacity-70" />
        }
      </button>

      {/* Children — indented with left border */}
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-blue-700 space-y-0.5">
          {children.map(item => (
            <NavLink key={item.name} to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-800 text-white' : 'text-blue-300 hover:bg-blue-800 hover:text-white'}`
              }>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const options = [
    { value: 'light',  icon: SunIcon,             label: 'Light' },
    { value: 'dark',   icon: MoonIcon,             label: 'Dark' },
    { value: 'system', icon: ComputerDesktopIcon,  label: 'System' },
  ];
  return (
    <div className="flex items-center gap-1 bg-blue-950/50 rounded-lg p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={`p-1.5 rounded-md transition-colors ${theme === value ? 'bg-blue-700 text-white' : 'text-blue-300 hover:text-white'}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try { await authApi.logout(refreshToken); } catch {}
    logout();
    navigate('/login');
    toast.success('Logged out');
  }

  const canAdmin = ['super_admin', 'admin'].includes(user?.role);
  useSocketAuth(); // join socket rooms for real-time events

  // Pending account-request badge — only fetched for admins
  const { data: reqCountData, refetch: refetchReqCount } = useQuery({
    queryKey: ['user-requests', 'count'],
    queryFn: () => userRequestsApi.pendingCount().then(r => r.data),
    enabled: canAdmin,
    refetchInterval: 60_000,
  });
  const pendingRequestCount = reqCountData?.count ?? 0;
  // Refresh badge when a new notification arrives (could be a new account request)
  useSocketEvent('notification:new', () => { if (canAdmin) refetchReqCount(); });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-mit-blue flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex flex-col items-center px-6 pt-5 pb-4 border-b border-blue-800">
          <div className="flex items-center gap-3 w-full">
            <img src="/tanzania-emblem.svg" alt="Tanzania National Emblem" className="w-10 h-10 flex-shrink-0 drop-shadow" />
            <div className="text-white flex-1">
              <p className="font-bold text-sm leading-tight">Ministry of Industry & Trade</p>
              <p className="text-blue-300 text-xs">M&amp;E System</p>
            </div>
            <button className="ml-auto lg:hidden text-blue-300" onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavSection items={filterByRole(mainNav, user?.role)} />

          <SectionLabel label="Data & Operations" />
          <NavSection items={filterByRole(dataNav, user?.role)} />

          <SectionLabel label="Reports & Analytics" />
          <CollapsibleReports canAdmin={canAdmin} currentPath={location.pathname} userRole={user?.role} />

          {canAdmin && (
            <>
              <SectionLabel label="Administration" />
              <NavSection items={adminNav} requestCount={pendingRequestCount} />
            </>
          )}
        </nav>

        {/* Theme toggle */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <span className="text-blue-400 text-xs">Theme</span>
          <ThemeToggle />
        </div>

        {/* User */}
        <div className="border-t border-blue-800 px-4 py-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-mit-gold rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-blue-300 text-xs truncate capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={handleLogout} className="text-blue-300 hover:text-white transition-colors" title="Logout">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
          <NavLink
            to="/settings/security"
            className={({ isActive }) =>
              `w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'bg-blue-800 text-white' : 'text-blue-300 hover:bg-blue-800 hover:text-white'}`
            }
          >
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Security Settings
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 lg:hidden">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="font-semibold text-mit-blue lg:hidden">Ministry of Industry & Trade: M&amp;E System</span>
          {/* Spacer — pushes bell to the right on desktop */}
          <div className="flex-1" />
          {/* Notification bell — visible on all screen sizes */}
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Tanzania coat of arms — subtle background watermark */}
          <div
            className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-[0.03] dark:opacity-[0.04]"
            aria-hidden="true"
          >
            <img
              src="/tanzania-emblem.svg"
              alt=""
              className="w-[520px] h-[520px] object-contain select-none"
            />
          </div>
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
      <SessionTimer />
      <NetworkStatus />
    </div>
  );
}
