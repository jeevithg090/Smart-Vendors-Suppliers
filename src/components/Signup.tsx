import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MIN_PASSWORD_LENGTH = 8;

interface SignupProps {
  onSwitchToLogin: () => void;
  preSelectedRole: 'vendor' | 'supplier';
  onBackToRoleSelection: () => void;
}

export default function Signup({ onSwitchToLogin, preSelectedRole, onBackToRoleSelection }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const { signup, isSubmitting } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !firstName) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    const result = await signup(email, password, firstName, lastName, preSelectedRole);
    if (!result.success) {
      setError(result.error || 'Signup failed. Please try again.');
    }
    // On success the auth state change redirects to the dashboard.
  };

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-orange-100">
            <span className="text-2xl">🏪</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Smart Street as {preSelectedRole === 'vendor' ? 'Vendor' : 'Supplier'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {preSelectedRole === 'vendor'
              ? 'Start buying from suppliers in your area'
              : 'Start selling to vendors in your area'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="At least 8 characters"
                aria-describedby="password-hint"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p id="password-hint" className="mt-1 text-xs text-gray-600">
                Use at least 8 characters.
              </p>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-center">
              <div className="text-lg mr-2">{preSelectedRole === 'vendor' ? '🏪' : '🚚'}</div>
              <div className="text-sm">
                <span className="font-medium text-orange-800">
                  Creating account as {preSelectedRole === 'vendor' ? 'Vendor' : 'Supplier'}
                </span>
              </div>
              <button
                type="button"
                onClick={onBackToRoleSelection}
                className="ml-auto text-xs text-orange-600 hover:text-orange-500 underline"
              >
                Change
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-orange-600 hover:text-orange-500 text-sm"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>

        {/* Demo note */}
      </div>
    </main>
  );
}
