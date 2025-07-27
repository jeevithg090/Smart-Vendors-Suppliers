import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  // Redirect authenticated users to their dashboard
  if (isAuthenticated && user) {
    const dashboardPath = user.role === 'vendor' ? '/vendor/dashboard' : '/supplier/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Smart Street
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connecting street food vendors with trusted suppliers for affordable raw materials
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Choose Your Role
            </h2>
            <p className="text-gray-600">
              Select whether you're a vendor looking for supplies or a supplier offering materials
            </p>
          </div>

          {/* Role Selection Buttons */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Vendor Button */}
            <div className="text-center">
              <Link
                to="/auth"
                className="btn-primary w-full mb-4 block"
              >
                <div className="flex flex-col items-center">
                  <div className="text-2xl mb-2">🍽️</div>
                  <span className="text-lg">I'm a Vendor</span>
                </div>
              </Link>
              <p className="text-sm text-gray-600">
                Street food sellers looking for quality ingredients
              </p>
            </div>

            {/* Supplier Button */}
            <div className="text-center">
              <Link
                to="/auth"
                className="btn-secondary w-full mb-4 block"
              >
                <div className="flex flex-col items-center">
                  <div className="text-2xl mb-2">🏪</div>
                  <span className="text-lg">I'm a Supplier</span>
                </div>
              </Link>
              <p className="text-sm text-gray-600">
                Wholesalers and distributors offering raw materials
              </p>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-semibold text-gray-800 mb-2">Direct Connection</h3>
              <p className="text-sm text-gray-600">
                Connect directly with suppliers without middlemen
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-gray-800 mb-2">Better Prices</h3>
              <p className="text-sm text-gray-600">
                Get competitive prices through group ordering
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">✅</div>
              <h3 className="font-semibold text-gray-800 mb-2">Quality Assured</h3>
              <p className="text-sm text-gray-600">
                FSSAI certified suppliers with quality guarantee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
