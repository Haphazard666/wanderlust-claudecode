import { User } from '../types';

interface SidebarProps {
  user: User;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const navItems = [
  { view: 'dashboard', label: 'Dashboard', icon: '🧭' },
  { view: 'discover',  label: 'Discover',  icon: '🔍' },
  { view: 'community', label: 'Community', icon: '👥' },
  { view: 'settings',  label: 'Settings',  icon: '⚙️' },
];

export default function Sidebar({ user, activeView, onNavigate, onLogout }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-100 flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-lg flex-shrink-0">
            ✈️
          </div>
          <span className="text-xs font-black tracking-widest text-slate-800">WANDERLUST</span>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-5 pb-6">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.firstName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {user.firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-bold text-slate-700 truncate">{user.firstName}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {navItems.map(({ view, label, icon }) => {
            const isActive = activeView === view;
            return (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm w-full text-left transition-colors duration-200 ${
                  isActive
                    ? 'bg-amber-50 text-amber-600 border-r-2 border-amber-500 font-bold'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-6">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm w-full text-left text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors duration-200"
          >
            <span className="text-base">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 flex items-center justify-around px-2 py-2">
        {navItems.map(({ view, icon }) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className={`flex items-center justify-center w-12 h-12 rounded-xl text-xl transition-colors duration-200 ${
                isActive ? 'bg-amber-50' : 'hover:bg-slate-50'
              }`}
            >
              {icon}
            </button>
          );
        })}
        <button
          onClick={onLogout}
          className="flex items-center justify-center w-12 h-12 rounded-xl text-xl hover:bg-red-50 transition-colors duration-200"
        >
          🚪
        </button>
      </nav>
    </>
  );
}
