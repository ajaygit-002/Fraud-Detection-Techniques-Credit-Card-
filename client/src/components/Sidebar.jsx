import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LayoutDashboard, MonitorPlay, AlertTriangle, List, Shield, LogOut } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Monitor', path: '/monitor', icon: <MonitorPlay size={20} /> },
    { name: 'History', path: '/history', icon: <List size={20} /> },
    { name: 'Alerts', path: '/alerts', icon: <AlertTriangle size={20} /> },
  ];

  if (user?.role === 'admin') {
    links.push({ name: 'Admin Rules', path: '/admin', icon: <Shield size={20} /> });
  }

  return (
    <div className="w-64 bg-slate-900 min-h-screen text-slate-300 flex flex-col">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 text-white font-bold text-xl mb-1">
          <ShieldCheck className="text-emerald-500" size={28} />
          <span>FraudGuard</span>
        </div>
        <p className="text-xs text-slate-500 mb-8 mt-1">Real-time Anomaly Detection</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === link.path
                ? 'bg-slate-800 text-white shadow-sm'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className={location.pathname === link.path ? 'text-emerald-500' : ''}>
              {link.icon}
            </span>
            <span className="font-medium">{link.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white uppercase">
            {user?.username?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
