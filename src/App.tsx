import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthFlow from './components/AuthFlow';
import LanguageTranslator from './components/LanguageTranslator';

// Lazy load components for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const SupplierDashboard = lazy(() => import('./pages/SupplierDashboard'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status">
    <div
      className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500"
      aria-hidden="true"
    ></div>
    <span className="sr-only">Loading…</span>
  </div>
);

// Auth component that handles role selection and authentication flow
const AuthComponent = () => {
  return <AuthFlow />;
};

// Protected route component
const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'vendor' | 'supplier';
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user?.role === 'vendor' ? '/vendor/dashboard' : '/supplier/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark('app-mounted');
    }
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <LanguageTranslator />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />

          {/* Authentication route */}
          <Route
            path="/auth"
            element={
              isAuthenticated ? (
                <Navigate
                  to={user?.role === 'vendor' ? '/vendor/dashboard' : '/supplier/dashboard'}
                  replace
                />
              ) : (
                <AuthComponent />
              )
            }
          />

          {/* Protected vendor routes */}
          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute requiredRole="vendor">
                <VendorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected supplier routes */}
          <Route
            path="/supplier/dashboard"
            element={
              <ProtectedRoute requiredRole="supplier">
                <SupplierDashboard />
              </ProtectedRoute>
            }
          />

          {/* Legacy routes - redirect to new auth system */}
          <Route path="/vendor/auth" element={<Navigate to="/auth" replace />} />
          <Route path="/supplier/auth" element={<Navigate to="/auth" replace />} />

          {/* Unknown routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
