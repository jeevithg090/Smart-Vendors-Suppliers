import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSwitchToSignup: () => void;
  preSelectedRole: 'vendor' | 'supplier';
  onBackToRoleSelection: () => void;
}

export default function Login({ onSwitchToSignup, preSelectedRole, onBackToRoleSelection }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('Login attempt:', { email, role: preSelectedRole, passwordLength: password.length });

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    try {
      const success = await login(email, password, preSelectedRole);
      console.log('Login result:', success);
      if (!success) {
        setError('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error in component:', error);
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-orange-100">
            <span className="text-2xl">🏪</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Smart Street
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect vendors and suppliers for smarter sourcing
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('vendor')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  role === 'vendor'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-1">🏪</div>
                <div className="text-sm font-medium">Vendor</div>
                <div className="text-xs text-gray-500">Buy from suppliers</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('supplier')}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  role === 'supplier'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-1">🚚</div>
                <div className="text-sm font-medium">Supplier</div>
                <div className="text-xs text-gray-500">Sell to vendors</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-orange-600 hover:text-orange-500 text-sm"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </form>

        {/* Demo credentials */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Mode</h3>
          <p className="text-xs text-blue-700">
            Use any email and password (4+ characters) to log in.
            Choose your role as Vendor or Supplier to see different dashboards.
          </p>
        </div>
      </div>
    </div>
  );
}
