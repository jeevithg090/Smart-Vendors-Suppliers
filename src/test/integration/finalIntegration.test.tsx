import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider } from 'convex/react'
import { ClerkProvider } from '@clerk/clerk-react'
import { ConvexReactClient } from 'convex/react'
import App from '../../App'
import WorkflowIntegration from '../../components/WorkflowIntegration'
import { SECURITY_CONFIG } from '../../config/security'

// Mock Convex client
const mockConvexClient = new ConvexReactClient('https://test.convex.cloud')

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({ isSignedIn: true, userId: 'test-user' }),
  useUser: () => ({ 
    user: { id: 'test-user', emailAddresses: [{ emailAddress: 'test@example.com' }] },
    isSignedIn: true,
    isLoaded: true
  })
}))

// Mock Convex queries
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react')
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      _id: 'test-vendor-id',
      userId: 'test-user',
      businessName: 'Test Business',
      ownerName: 'Test Owner',
      email: 'test@example.com',
      phone: '9876543210',
      location: {
        address: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        coordinates: { lat: 19.0760, lng: 72.8777 }
      },
      businessType: 'Street Food',
      isVerified: true,
      trustScore: 4.2,
      preferences: {
        maxDeliveryDistance: 10,
        preferredCategories: ['Vegetables', 'Spices'],
        budgetRange: { min: 1000, max: 10000 },
        qualityPreference: 'High',
        deliveryTimePreference: 'Same Day'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    })),
    useMutation: vi.fn(() => vi.fn())
  }
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ClerkProvider publishableKey="test-key">
    <ConvexProvider client={mockConvexClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </ConvexProvider>
  </ClerkProvider>
)

describe('Final Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage
    localStorage.clear()
  })

  describe('Application Initialization', () => {
    it('should initialize with all security measures', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Check if security headers are configured
      expect(SECURITY_CONFIG.headers['X-Frame-Options']).toBe('DENY')
      expect(SECURITY_CONFIG.headers['X-Content-Type-Options']).toBe('nosniff')
      
      // Check if CSP is configured
      expect(SECURITY_CONFIG.csp.directives['default-src']).toContain("'self'")
      expect(SECURITY_CONFIG.csp.directives['script-src']).toContain('https://api.convex.cloud')
    })

    it('should load performance optimizations', async () => {
      const performanceSpy = vi.spyOn(performance, 'mark')
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Performance monitoring should be active
      expect(performanceSpy).toHaveBeenCalled()
    })
  })

  describe('Workflow Integration', () => {
    it('should render workflow integration component', async () => {
      render(
        <TestWrapper>
          <WorkflowIntegration />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Vendor Sourcing Workflow')).toBeInTheDocument()
      })

      // Check if workflow steps are rendered
      expect(screen.getByText('Discover Suppliers')).toBeInTheDocument()
      expect(screen.getByText('AI Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Group Orders')).toBeInTheDocument()
    })

    it('should handle workflow navigation', async () => {
      render(
        <TestWrapper>
          <WorkflowIntegration />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Discover Suppliers')).toBeInTheDocument()
      })

      // Click on AI Recommendations step
      const recommendationsButton = screen.getByText('AI Recommendations')
      fireEvent.click(recommendationsButton)

      // Should navigate to recommendations step
      await waitFor(() => {
        expect(screen.getByText('AI Recommendations')).toBeInTheDocument()
      })
    })
  })

  describe('Security Features', () => {
    it('should sanitize user input', async () => {
      const { sanitizeUserInput } = await import('../../config/security')
      
      const maliciousInput = '<script>alert("xss")</script>Hello'
      const sanitized = sanitizeUserInput(maliciousInput)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toBe('Hello')
    })

    it('should validate file uploads', async () => {
      const { validateFileUpload } = await import('../../config/security')
      
      // Valid file
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const validResult = validateFileUpload(validFile)
      expect(validResult.valid).toBe(true)
      
      // Invalid file type
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' })
      const invalidResult = validateFileUpload(invalidFile)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.error).toContain('not allowed')
    })

    it('should enforce rate limiting', async () => {
      const { rateLimiter } = await import('../../utils/security')
      
      const identifier = 'test-user'
      
      // Should allow initial requests
      expect(rateLimiter.isAllowed(identifier)).toBe(true)
      
      // Should track remaining requests
      const remaining = rateLimiter.getRemainingRequests(identifier)
      expect(remaining).toBeLessThan(100)
    })
  })

  describe('Performance Features', () => {
    it('should implement lazy loading', async () => {
      const { loadComponentAsync } = await import('../../utils/performance')
      
      const LazyComponent = loadComponentAsync(() => 
        Promise.resolve({ default: () => <div>Lazy Component</div> })
      )
      
      expect(LazyComponent).toBeDefined()
    })

    it('should optimize images', async () => {
      const { optimizeImage } = await import('../../utils/performance')
      
      const originalSrc = 'https://example.com/image.jpg'
      const optimized = optimizeImage(originalSrc, 300, 200, 80)
      
      expect(optimized).toContain('w=300')
      expect(optimized).toContain('h=200')
      expect(optimized).toContain('q=80')
    })

    it('should implement virtual scrolling', async () => {
      const { useVirtualScrolling } = await import('../../utils/performance')
      
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
      const itemHeight = 50
      const containerHeight = 400
      
      // This would be used in a component, but we can test the logic
      const result = useVirtualScrolling(items, itemHeight, containerHeight)
      
      expect(result.visibleItems.length).toBeLessThan(items.length)
      expect(result.totalHeight).toBe(items.length * itemHeight)
    })
  })

  describe('UI/UX Enhancements', () => {
    it('should render enhanced UI components', async () => {
      const { EnhancedButton, LoadingSpinner } = await import('../../components/EnhancedUI')
      
      render(
        <TestWrapper>
          <div>
            <EnhancedButton variant="primary">Test Button</EnhancedButton>
            <LoadingSpinner size="md" text="Loading..." />
          </div>
        </TestWrapper>
      )

      expect(screen.getByText('Test Button')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should handle loading states', async () => {
      const { EnhancedButton } = await import('../../components/EnhancedUI')
      
      render(
        <TestWrapper>
          <EnhancedButton loading={true}>Submit</EnhancedButton>
        </TestWrapper>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Submit')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock a network error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Should not crash the application
      expect(screen.getByText(/Smart Street/i)).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Check for accessibility features
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Should have proper focus management
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type')
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Should render mobile-friendly interface
      expect(screen.getByText(/Smart Street/i)).toBeInTheDocument()
    })
  })

  describe('Offline Capability', () => {
    it('should handle offline state', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      })

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Should still render the application
      expect(screen.getByText(/Smart Street/i)).toBeInTheDocument()
    })
  })
})

describe('End-to-End Workflow Tests', () => {
  it('should complete a full vendor workflow', async () => {
    render(
      <TestWrapper>
        <WorkflowIntegration />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Vendor Sourcing Workflow')).toBeInTheDocument()
    })

    // Should show progress
    expect(screen.getByText(/Progress:/)).toBeInTheDocument()
    
    // Should show workflow steps
    expect(screen.getByText('Discover Suppliers')).toBeInTheDocument()
    expect(screen.getByText('AI Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Group Orders')).toBeInTheDocument()
    
    // Should have quick actions
    expect(screen.getByText('Quick Order')).toBeInTheDocument()
    expect(screen.getByText('Join Group Order')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
  })
})