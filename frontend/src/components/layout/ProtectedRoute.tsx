import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function ProtectedRoute() {
    const { isValid } = useAuthStore();

    if (!isValid) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
