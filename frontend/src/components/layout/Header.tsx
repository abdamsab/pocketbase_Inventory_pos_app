import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Bell, Search, User, Sun, Moon, MapPin, ChevronDown } from 'lucide-react';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { useLocation } from '../../contexts/LocationContext';
import { useEffect } from 'react';

export function Header() {
    const { user } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const location = useRouterLocation();
    const { activeLocation, availableLocations, switchLocation, isLoading: isLoadingLocations } = useLocation();

    // Initialize theme on mount
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    // Simple breadcrumb logic
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.startsWith('/pos')) return 'Point of Sale';
        if (path.startsWith('/products')) return 'Inventory Management';
        if (path.startsWith('/settings')) return 'Settings';
        return 'Overview';
    };

    return (
        <header className="h-20 px-8 flex items-center justify-between border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
            {/* Page Title / Breadcrumbs */}
            <div>
                <h1 className="text-2xl font-heading font-bold text-text-main tracking-tight">
                    {getPageTitle()}
                </h1>
                <p className="text-sm text-text-muted mt-0.5">
                    Welcome back, {user?.name || 'User'}
                </p>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">

                {/* Location Switcher */}
                {!isLoadingLocations && availableLocations.length > 0 && (
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-surfaceHighlight/50 hover:bg-surfaceHighlight rounded-lg transition-colors border border-border">
                            <MapPin size={16} className="text-primary" />
                            <div className="text-left hidden sm:block">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">Location</p>
                                <p className="text-sm font-semibold text-text-main leading-tight truncate max-w-[120px]">
                                    {activeLocation === 'all' ? 'All Locations' : activeLocation?.name || 'Select Location'}
                                </p>
                            </div>
                            <ChevronDown size={14} className="text-text-muted" />
                        </button>

                        {/* Dropdown */}
                        <div className="absolute top-full right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl shadow-black/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform group-hover:translate-y-0 translate-y-2">
                            <div className="py-1">
                                {(user?.superuser || availableLocations.length > 1) && (
                                    <button
                                        onClick={() => switchLocation('all')}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between group/item ${activeLocation === 'all' ? 'bg-primary/5 text-primary font-medium' : 'text-text-main'}`}
                                    >
                                        <span>All Locations</span>
                                        {activeLocation === 'all' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                                    </button>
                                )}

                                {availableLocations.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => switchLocation(loc.id)}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between group/item ${activeLocation !== 'all' && activeLocation?.id === loc.id ? 'bg-primary/5 text-primary font-medium' : 'text-text-main'}`}
                                    >
                                        <span>{loc.name}</span>
                                        {activeLocation !== 'all' && activeLocation?.id === loc.id && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-surfaceHighlight"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Search Bar */}
                <div className="relative hidden md:block group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-surface border border-border rounded-full pl-10 pr-4 py-2 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-64 transition-all"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-surfaceHighlight">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 pl-6 border-l border-border">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-text-main">{user?.name}</p>
                        <p className="text-xs text-text-muted capitalize">{user?.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 ring-2 ring-surface">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User size={20} />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
