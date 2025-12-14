import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
    const { isValid, isLoading, isInitialized } = useAuthStore();

    console.log('🔐 ProtectedRoute: Auth state:', { isValid, isLoading, isInitialized });

    // Show loading spinner while auth is being initialized or validated
    if (!isInitialized || isLoading) {
        console.log('⏳ ProtectedRoute: Showing loading spinner - auth not initialized or loading');
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex items-center gap-3 text-primary">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-lg">Checking authentication...</span>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isValid) {
        return <Navigate to="/login" replace />;
    }

    // Render protected content
    return <Outlet />;
}
