import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import api from './lib/api';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

// Placeholder Page for Dashboard
const DashboardPlaceholder = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground p-8">
      <header className="flex justify-between items-center border-b border-border pb-4 mb-8">
        <h1 className="text-xl font-bold tracking-tight">ACME Salary</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Welcome, {user?.name} ({user?.role})
          </span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-destructive hover:underline cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg p-12">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Dashboard Page</h2>
          <p className="text-sm text-muted-foreground">
            Analytics dashboard and visualizations placeholder.
          </p>
        </div>
      </main>
    </div>
  );
};

// Placeholder Page for Employees
const EmployeesPlaceholder = () => (
  <div className="flex min-h-screen flex-col bg-background text-foreground p-8">
    <h1 className="text-xl font-bold tracking-tight mb-8">Employees List</h1>
    <div className="border border-dashed border-border rounded-lg p-12 text-center">
      <h2 className="text-lg font-semibold">Employees Management</h2>
      <p className="text-sm text-muted-foreground">
        List, search, filter, and pagination placeholder.
      </p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { setAuth, setInitialized } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    const performSilentRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh');
        const { accessToken, user } = res.data.data;
        setAuth(accessToken, user);
      } catch {
        // Non-logged in users should not fail the app initialization
      } finally {
        setInitialized(true);
      }
    };

    void performSilentRefresh();

    const handleSessionExpired = () => {
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, [setAuth, setInitialized, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <EmployeesPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
