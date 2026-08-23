import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/Toaster';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResidentDashboard from './pages/resident/ResidentDashboard';
import ResidentComplaints from './pages/resident/ResidentComplaints';
import ResidentComplaintNew from './pages/resident/ResidentComplaintNew';
import ResidentComplaintDetail from './pages/resident/ResidentComplaintDetail';
import ResidentNotices from './pages/resident/ResidentNotices';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminComplaintDetail from './pages/admin/AdminComplaintDetail';
import AdminNotices from './pages/admin/AdminNotices';
import AdminSettings from './pages/admin/AdminSettings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/resident/dashboard'} replace />;
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'ADMIN' | 'RESIDENT' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/resident/dashboard'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Resident */}
              <Route path="/resident/dashboard" element={<RequireAuth role="RESIDENT"><ResidentDashboard /></RequireAuth>} />
              <Route path="/resident/complaints" element={<RequireAuth role="RESIDENT"><ResidentComplaints /></RequireAuth>} />
              <Route path="/resident/complaints/new" element={<RequireAuth role="RESIDENT"><ResidentComplaintNew /></RequireAuth>} />
              <Route path="/resident/complaints/:id" element={<RequireAuth role="RESIDENT"><ResidentComplaintDetail /></RequireAuth>} />
              <Route path="/resident/notices" element={<RequireAuth role="RESIDENT"><ResidentNotices /></RequireAuth>} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<RequireAuth role="ADMIN"><AdminDashboard /></RequireAuth>} />
              <Route path="/admin/complaints" element={<RequireAuth role="ADMIN"><AdminComplaints /></RequireAuth>} />
              <Route path="/admin/complaints/:id" element={<RequireAuth role="ADMIN"><AdminComplaintDetail /></RequireAuth>} />
              <Route path="/admin/notices" element={<RequireAuth role="ADMIN"><AdminNotices /></RequireAuth>} />
              <Route path="/admin/settings" element={<RequireAuth role="ADMIN"><AdminSettings /></RequireAuth>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </Toaster>
      </AuthProvider>
    </QueryClientProvider>
  );
}
