import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, Store, User as UserIcon, Building2, FileText, TrendingUp, Tag, MapPin, Database, Receipt } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';

export function Sidebar() {
    const logout = useAuthStore((state) => state.logout);
    const { user } = useAuthStore();

    // Build navigation items in the specified order
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/pos', icon: ShoppingCart, label: 'Point of Sale' },
        { to: '/sales', icon: TrendingUp, label: 'Sale history' },
        { to: '/sales-items', icon: Receipt, label: 'Sales Items' },
        // Categories (admin/manager only)
        ...(user?.role === 'admin' || user?.role === 'manager' ? [{ to: '/categories', icon: Tag, label: 'Categories' }] : []),
        { to: '/products', icon: Package, label: 'Inventory' },
        { to: '/inventory-entries', icon: Database, label: 'Inventory History' },
        { to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
        // Locations (admin/manager only)
        ...(user?.role === 'admin' || user?.role === 'manager' ? [{ to: '/locations', icon: MapPin, label: 'Locations' }] : []),
        { to: '/suppliers', icon: Building2, label: 'Suppliers' },
        // Users (admin only)
        ...(user?.role === 'admin' ? [{ to: '/users', icon: UserIcon, label: 'users' }] : []),
        { to: '/reports', icon: FileText, label: 'reports' },
        { to: '/settings', icon: Settings, label: 'settings' },
    ];

    return (
        <aside className="w-72 h-full flex flex-col border-r border-border bg-surface/50 backdrop-blur-xl transition-all duration-300 z-20">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-8 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <Store className="text-primary w-6 h-6" />
                    </div>
                    <span className="font-heading font-bold text-xl tracking-tight text-text-main">
                        Nexus<span className="text-primary">POS</span>
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm',
                                isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/25 font-medium'
                                    : 'text-text-muted hover:bg-surfaceHighlight hover:text-text-main'
                            )
                        }
                    >
                        <item.icon size={18} className="transition-transform group-hover:scale-110 duration-200" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User Profile / Logout */}
            <div className="p-4 border-t border-border">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-text-muted hover:bg-danger/10 hover:text-danger transition-all duration-200 group"
                >
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
