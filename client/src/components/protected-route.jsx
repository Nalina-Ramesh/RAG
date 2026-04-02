import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../state/auth-context';

export const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/chat" replace />;

  return <Outlet />;
};

