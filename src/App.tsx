import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AuthFlow from './components/AuthFlow'

// Lazy load components for better performance
const HomePage = lazy(() => import('./pages/HomePage'))
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'))
const SupplierDashboard = lazy(() => import('./pages/SupplierDashboard'))

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
  </div>
)

// Auth component that handles role selection and authentication flow
const AuthComponent = () => {
  return <AuthFlow />;
};

// Protected route component
const ProtectedRoute = ({ children, requiredRole }: {
  children: React.ReactNode,
  requiredRole?: 'vendor' | 'supplier'
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user?.role === 'vendor' ? '/vendor/dashboard' : '/supplier/dashboard';
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}

function App() {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />

          {/* Authentication route */}
          <Route path="/auth" element={
            isAuthenticated ? (
              <Navigate to={user?.role === 'vendor' ? "/vendor/dashboard" : "/supplier/dashboard"} replace />
            ) : (
              <AuthComponent />
            )
          } />

          {/* Protected vendor routes */}
          <Route path="/vendor/dashboard" element={
            <ProtectedRoute requiredRole="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          } />

          {/* Protected supplier routes */}
          <Route path="/supplier/dashboard" element={
            <ProtectedRoute requiredRole="supplier">
              <SupplierDashboard />
            </ProtectedRoute>
          } />

          {/* Legacy routes - redirect to new auth system */}
          <Route path="/vendor/auth" element={<Navigate to="/auth" replace />} />
          <Route path="/supplier/auth" element={<Navigate to="/auth" replace />} />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
