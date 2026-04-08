import { Outlet, NavLink } from 'react-router-dom';
import { useAuth, hasRole } from '../lib/auth.js';
import type { FcRole } from '../lib/auth.js';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: FcRole[]; // Which roles can see this nav item
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['fc_admin', 'factory_admin', 'factory_operator', 'factory_viewer'] },
  { to: '/orders', label: 'Orders', icon: '📦', roles: ['fc_admin', 'factory_admin', 'factory_operator', 'factory_viewer'] },
  { to: '/orders/explorer', label: 'Order Explorer', icon: '🔍', roles: ['fc_admin', 'factory_admin', 'factory_operator', 'factory_viewer'] },
  { to: '/mapping-studio', label: 'Mapping Studio', icon: '🗺️', roles: ['fc_admin', 'factory_admin', 'factory_operator'] },
  { to: '/edi-monitor', label: 'EDI Monitor', icon: '📨', roles: ['fc_admin', 'factory_admin', 'factory_operator'] },
  { to: '/bridge-status', label: 'Bridge Status', icon: '🌉', roles: ['fc_admin', 'factory_admin', 'factory_operator'] },
  { to: '/shipments', label: 'Shipments', icon: '🚚', roles: ['fc_admin', 'factory_admin', 'factory_operator', 'factory_viewer'] },
  { to: '/invoices', label: 'Invoices', icon: '🧾', roles: ['fc_admin', 'factory_admin', 'factory_operator', 'factory_viewer'] },
  { to: '/connections', label: 'Connections', icon: '🔗', roles: ['fc_admin', 'factory_admin', 'factory_operator'] },
  { to: '/calendar', label: 'Calendar', icon: '📅', roles: ['fc_admin', 'factory_admin', 'factory_operator', 'factory_viewer'] },
  { to: '/analytics', label: 'Analytics', icon: '📈', roles: ['fc_admin', 'factory_admin'] },
  { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['fc_admin', 'factory_admin', 'factory_viewer'] },
  { to: '/admin', label: 'Admin', icon: '🛡️', roles: ['fc_admin'] },
];

const roleBadgeColors: Record<string, string> = {
  fc_admin: 'bg-red-100 text-red-700',
  factory_admin: 'bg-blue-100 text-blue-700',
  factory_operator: 'bg-yellow-100 text-yellow-700',
  factory_viewer: 'bg-gray-100 text-gray-600',
};

const roleLabels: Record<string, string> = {
  fc_admin: 'Platform Admin',
  factory_admin: 'Factory Admin',
  factory_operator: 'Operator',
  factory_viewer: 'Viewer',
};

export function Layout() {
  const { user, logout } = useAuth();

  const visibleNavItems = navItems.filter(item =>
    hasRole(user, item.roles),
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">FactoryConnect</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          {user?.factory_name && (
            <p className="text-xs text-gray-400 mt-0.5">{user.factory_name}</p>
          )}
          {user?.role && (
            <span className={`inline-flex mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${roleBadgeColors[user.role] || 'bg-gray-100'}`}>
              {roleLabels[user.role] || user.role}
            </span>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={logout} className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg text-left">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
