import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
    const location = useLocation();
    return (
        <div className="flex h-screen bg-background text-text-main overflow-hidden font-sans selection:bg-primary selection:text-white">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
                <Header />

                <main className={`flex-1 ${location.pathname.startsWith('/pos') ? 'overflow-hidden p-0' : 'overflow-y-auto p-6 scroll-smooth'}`}>
                    <div className={`w-full animate-fade-in ${!location.pathname.startsWith('/pos') ? 'max-w-7xl mx-auto' : 'h-full'}`}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
