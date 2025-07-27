import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  path: string
  label: string
  icon: string
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/vendor/dashboard', label: 'Dashboard', icon: '📊', requiresAuth: true },
  { path: '/suppliers', label: 'Suppliers', icon: '🏪', requiresAuth: true },
  { path: '/orders', label: 'Orders', icon: '📦', requiresAuth: true },
  { path: '/profile', label: 'Profile', icon: '👤', requiresAuth: true },
]

export default function MobileNavigation() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Hide/show navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Filter nav items based on auth status
  const visibleNavItems = navItems.filter(item => 
    !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  )

  if (!isAuthenticated || visibleNavItems.length === 0) {
    return null
  }

  return (
    <nav 
      className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center py-2">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center p-2 min-w-0 flex-1
                transition-colors duration-200 rounded-lg mx-1
                ${isActive 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                }
              `}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
