import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  Settings,
  Home,
} from 'lucide-react';

export function CaLayout() {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', href: '/ca', icon: Home },
    { label: 'Clients', href: '/ca/clients', icon: Users },
    { label: 'Compliance', href: '/ca/compliance', icon: CheckCircle },
    { label: 'Reconciliation', href: '/ca/reconciliation', icon: RotateCcw },
    { label: 'Documents', href: '/ca/documents', icon: FileText },
    { label: 'Notices', href: '/ca/notices', icon: AlertCircle },
    { label: 'Analytics', href: '/ca/analytics', icon: BarChart3 },
    { label: 'Communication', href: '/ca/communication', icon: MessageSquare },
    { label: 'Settings', href: '/ca/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">CA Platform</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== '/ca' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
