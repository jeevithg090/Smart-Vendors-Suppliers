import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CommunicationHub } from './CommunicationHub'
import PWAInstaller from './PWAInstaller'
import { OfflineManager } from './OfflineManager'
import MobileNavigation from './MobileNavigation'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isHomePage = location.pathname === '/'

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Offline Manager */}
      <OfflineManager>
        {children}
      </OfflineManager>
      
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-xl md:text-2xl">🍽️</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 hidden xs:block">
                Smart Street
              </span>
              <span className="text-lg md:text-xl font-bold text-gray-800 xs:hidden">
                SS
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {!isHomePage && (
                <Link 
                  to="/" 
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Home
                </Link>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/vendor/dashboard"
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {user?.firstName}
                    </span>
                    <button
                      onClick={logout}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/vendor/auth" 
                    className="text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Vendor Login
                  </Link>
                  <Link 
                    to="/supplier/auth" 
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Supplier Login
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Toggle mobile menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {!isHomePage && (
                  <Link 
                    to="/" 
                    className="block px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                )}
                
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/vendor/dashboard" 
                      className="block px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Welcome, {user?.firstName}
                      </span>
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/vendor/auth" 
                      className="block px-3 py-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Vendor Login
                    </Link>
                    <Link 
                      to="/supplier/auth" 
                      className="block px-3 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-md transition-colors text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Supplier Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      {/* Communication Hub - Only show when authenticated */}
      {isAuthenticated && <CommunicationHub />}

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* PWA Installer */}
      <PWAInstaller />

      {/* Footer */}
      {isHomePage && (
        <footer className="bg-white border-t mt-8 md:mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                Solving for Street Food • Tutedude Hackathon 1.0
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Connecting vendors with trusted suppliers for affordable raw materials
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
