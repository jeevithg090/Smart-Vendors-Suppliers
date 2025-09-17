import { useEffect, useState } from 'react'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialDark = stored ? stored === 'dark' : prefersDark
      setIsDark(initialDark)
      document.documentElement.classList.toggle('dark', initialDark)
    } catch (_) {
      // no-op
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    try {
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch (_) {
      // no-op
    }
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className={
        `btn-press rounded-md px-3 py-2 text-sm border border-gray-200 hover:bg-gray-100 ` +
        `dark:border-gray-700 dark:hover:bg-gray-800 transition-colors ${className}`
      }
    >
      <span className="hidden sm:inline">{isDark ? '☀️ Light' : '🌙 Dark'}</span>
      <span className="sm:hidden">{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}

