interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const navItems = [
  { view: 'dashboard', label: 'Dashboard', icon: '🧭' },
  { view: 'settings',  label: 'Settings',  icon: '⚙️' },
];

export default function Sidebar({ activeView, onNavigate, onLogout }: SidebarProps) {
  return (
    <>
      {/* Desktop icon rail */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-18 bg-white border-r border-slate-100 flex-col items-center z-40">
        {/* Logo */}
        <div className="py-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-lg hover:bg-amber-400 transition-colors duration-200"
          >
            ✈️
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 overflow-y-auto hide-scrollbar">
          {navItems.map(({ view, label, icon }) => {
            const isActive = activeView === view;
            return (
              <div key={view} className="relative group flex justify-center w-full">
                <button
                  onClick={() => onNavigate(view)}
                  className={`flex items-center justify-center w-11 h-11 rounded-xl text-xl transition-colors duration-200 ${
                    isActive
                      ? 'bg-amber-100 text-amber-600'
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  {icon}
                </button>
                <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="pb-6 flex flex-col items-center w-full px-2">
          <div className="relative group flex justify-center w-full">
            <button
              onClick={onLogout}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors duration-200"
            >
              🚪
            </button>
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Sign Out
            </span>
          </div>
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
