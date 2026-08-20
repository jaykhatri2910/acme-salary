import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import api from './lib/api';
import { decodeToken } from './lib/jwt';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { Dashboard } from './pages/Dashboard';
import { Users, LogOut, LayoutDashboard } from 'lucide-react';

const queryClient = new QueryClient();

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 outline-none">
              <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                ACME Salary
              </span>
            </Link>

            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      isActive
                        ? 'bg-slate-900 text-slate-100'
                        : 'text-muted-foreground hover:bg-slate-900/50 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {user?.role.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent hover:bg-rose-950/20 hover:text-rose-400 transition-colors outline-none cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { setAuth, setInitialized } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    let cancelled = false;

    const performSilentRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh');
        if (cancelled) return;
        const { accessToken } = res.data.data;
        const decoded = decodeToken(accessToken);
        const user = decoded
          ? {
              id: decoded.userId,
              role: decoded.role,
              name: decoded.role === 'hr_manager' ? 'HR Manager' : 'HR Staff',
              email: '',
            }
          : null;
        setAuth(accessToken, user);
      } catch {
        // Unauthenticated initial user is fine
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };

    void performSilentRefresh();

    const handleSessionExpired = () => {
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);

    return () => {
      cancelled = true;
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
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Employees />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <EmployeeDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
