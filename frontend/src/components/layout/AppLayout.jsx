import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  HomeIcon, ChartBarIcon, DocumentTextIcon, ClipboardDocumentListIcon,
  BuildingOfficeIcon, UsersIcon, CurrencyDollarIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, BuildingLibraryIcon,
  BuildingStorefrontIcon, BriefcaseIcon, ArrowsRightLeftIcon, LockClosedIcon,
  CalendarDaysIcon, FolderOpenIcon, SparklesIcon,
  ArchiveBoxIcon, CheckBadgeIcon, TableCellsIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../api';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../ChangePasswordModal';
import NotificationBell from '../NotificationBell';
import SessionTimer from '../SessionTimer';
import NetworkStatus from '../NetworkStatus';

const navigation = [
  { name: 'Dashboard',          href: '/dashboard',                       icon: HomeIcon },
  { name: 'Results Framework',  href: '/framework/ministerial',           icon: BuildingLibraryIcon },
  { name: 'Indicators',         href: '/indicators',                      icon: ChartBarIcon },
  { name: 'Data Entry',         href: '/data-entry',                      icon: ClipboardDocumentListIcon },
  { name: 'Approval Queue',     href: '/data-entry/approval-queue',       icon: CheckBadgeIcon },
  { name: 'Industry Statistics',href: '/data-entry/industry-statistics',  icon: BuildingStorefrontIcon },
  { name: 'Projects',           href: '/projects',                        icon: BriefcaseIcon },
  { name: 'Activity Workplan',  href: '/workplan',                        icon: TableCellsIcon },
  { name: 'Budget',             href: '/budget',                          icon: CurrencyDollarIcon },
  { name: 'Reports',            href: '/reports',                         icon: DocumentTextIcon },
  { name: 'Analytics',          href: '/analytics',                       icon: SparklesIcon },
  { name: 'Documents',          href: '/documents',                       icon: FolderOpenIcon },
];

const adminNav = [
  { name: 'MIT',              href: '/admin/mit',           icon: BuildingLibraryIcon },
  { name: 'Institutions',     href: '/admin/institutions',  icon: BuildingOfficeIcon },
  { name: 'Users',            href: '/admin/users',         icon: UsersIcon },
  { name: 'Integrations',     href: '/admin/integrations',  icon: ArrowsRightLeftIcon },
  { name: 'Calendar',         href: '/admin/calendar',      icon: CalendarDaysIcon },
  { name: 'Period Locks',     href: '/admin/period-locks',  icon: LockClosedIcon },
  { name: 'FW Versions',     href: '/framework/versions',  icon: ArchiveBoxIcon },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await authApi.logout(refreshToken); } catch {}
    logout();
    navigate('/login');
    toast.success('Logged out');
  }

  const canAdmin = ['super_admin', 'admin'].includes(user?.role);

  return (
    <div className="flex h-screen bg-gray-50">
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      {/* Mobile sidebar overlay */}
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
          {navigation.map((item) => (
            <NavLink key={item.name} to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`
              }>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}

          {canAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-xs font-semibold text-blue-400 uppercase tracking-wider">Administration</div>
              {adminNav.map((item) => (
                <NavLink key={item.name} to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`
                  }>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              ))}
            </>
          )}
        </nav>

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
            <NotificationBell />
            <button onClick={handleLogout} className="text-blue-300 hover:text-white transition-colors" title="Logout">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowChangePw(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-blue-300 hover:bg-blue-800 hover:text-white transition-colors"
          >
            <LockClosedIcon className="w-3.5 h-3.5" />
            Change Password
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="font-semibold text-mit-blue">Ministry of Industry & Trade — M&amp;E System</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <SessionTimer />
      <NetworkStatus />
    </div>
  );
}
