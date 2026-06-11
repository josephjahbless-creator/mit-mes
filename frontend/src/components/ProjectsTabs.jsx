import { NavLink } from 'react-router-dom';
import { FolderOpenIcon, RocketLaunchIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../store/authStore';

/**
 * Sub-navigation for the Projects Module.
 *
 * Strategic Flagships and Activity Mapping live INSIDE the Projects Module
 * because projects are the implementation vehicle through which strategic
 * objectives are achieved — this keeps planning → implementation → monitoring
 * → reporting in one coherent workflow.
 */
const TABS = [
  { to: '/projects',          label: 'Projects',           icon: FolderOpenIcon,      end: true,  roles: ['all'] },
  { to: '/projects/flagships', label: 'Strategic Flagships', icon: RocketLaunchIcon,   end: false, roles: ['all'] },
  { to: '/projects/mapping',  label: 'Activity Mapping',   icon: ArrowsRightLeftIcon, end: false, roles: ['super_admin', 'admin', 'me_officer'] },
];

export default function ProjectsTabs() {
  const role = useAuthStore(s => s.user?.role);
  const tabs = TABS.filter(t => t.roles.includes('all') || t.roles.includes(role));

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="flex gap-1 -mb-px overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
