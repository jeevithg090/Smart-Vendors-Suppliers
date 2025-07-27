import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="main-navigation"]', { timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    // Try to perform an action that requires network
    await page.click('[data-testid="search-suppliers"]');

    // Should show error message but not crash
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Application should still be functional
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
  });

  test('should show offline indicator when network is unavailable', async ({ page }) => {
    // Simulate going offline
    await page.context().setOffline(true);

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('text=You\'re offline')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Offline indicator should disappear
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    // Navigate to a form (e.g., vendor registration)
    await page.goto('/register');

    // Submit form without required fields
    await page.click('[data-testid="submit-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="error-businessName"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();

    // Fill in valid data
    await page.fill('[data-testid="input-businessName"]', 'Test Business');
    await page.fill('[data-testid="input-email"]', 'test@example.com');
    await page.fill('[data-testid="input-phone"]', '+91 9876543210');
    await page.fill('[data-testid="input-password"]', 'StrongPass123');

    // Errors should disappear
    await expect(page.locator('[data-testid="error-businessName"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).not.toBeVisible();
  });

  test('should recover from JavaScript errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Trigger a JavaScript error (this would be a real scenario in your app)
    await page.evaluate(() => {
      // Simulate an error that might occur in the application
      throw new Error('Simulated runtime error');
    });

    // Application should still be responsive
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Error should be logged
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should handle server errors with retry mechanism', async ({ page }) => {
    let requestCount = 0;

    // Mock server to fail first few requests then succeed
    await page.route('**/api/suppliers', route => {
      requestCount++;
      if (requestCount <= 2) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: '1', businessName: 'Test Supplier', trustScore: 4.5 }
          ])
        });
      }
    });

    // Trigger an action that calls the API
    await page.click('[data-testid="search-suppliers"]');

    // Should eventually succeed after retries
    await expect(page.locator('[data-testid="supplier-card"]')).toBeVisible();
    
    // Should have made multiple requests
    expect(requestCount).toBeGreaterThan(1);
  });

  test('should show loading states during operations', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/suppliers', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      }, 2000);
    });

    // Trigger search
    await page.click('[data-testid="search-suppliers"]');

    // Should show loading indicator
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Loading should disappear when request completes
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle authentication errors', async ({ page }) => {
    // Mock authentication failure
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    // Try to access protected resource
    await page.goto('/dashboard');

    // Should redirect to login or show auth error
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should maintain functionality during intermittent connectivity', async ({ page }) => {
    // Start online
    await page.context().setOffline(false);
    
    // Navigate to a page with data
    await page.goto('/suppliers');
    await expect(page.locator('[data-testid="supplier-list"]')).toBeVisible();

    // Go offline
    await page.context().setOffline(true);
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Try to perform an action (should be queued)
    await page.click('[data-testid="favorite-supplier"]');
    
    // Should show pending action indicator
    await expect(page.locator('[data-testid="pending-actions"]')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);
    
    // Pending actions should be processed
    await expect(page.locator('[data-testid="pending-actions"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle business logic errors with user guidance', async ({ page }) => {
    // Navigate to order placement
    await page.goto('/order');
    
    // Mock insufficient stock response
    await page.route('**/api/orders', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock available',
          suggestions: ['Reduce quantity', 'Try different supplier']
        })
      });
    });

    // Fill order form
    await page.fill('[data-testid="input-quantity"]', '100');
    await page.click('[data-testid="place-order-button"]');

    // Should show business error with suggestions
    await expect(page.locator('[data-testid="business-error"]')).toBeVisible();
    await expect(page.locator('text=Not enough stock available')).toBeVisible();
    await expect(page.locator('text=Reduce quantity')).toBeVisible();
    await expect(page.locator('text=Try different supplier')).toBeVisible();
  });

  test('should handle chunk loading errors gracefully', async ({ page }) => {
    // Mock chunk loading failure
    await page.route('**/*.js', route => {
      if (route.request().url().includes('chunk')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Try to navigate to a lazy-loaded route
    await page.click('[data-testid="analytics-link"]');

    // Should show chunk load error with reload option
    await expect(page.locator('[data-testid="chunk-error"]')).toBeVisible();
    await expect(page.locator('text=Failed to load page')).toBeVisible();
    await expect(page.locator('[data-testid="reload-button"]')).toBeVisible();
  });

  test('should track error metrics and performance impact', async ({ page }) => {
    let errorMetrics: any[] = [];
    
    // Intercept metrics reporting
    await page.route('**/api/metrics', route => {
      const postData = route.request().postDataJSON();
      errorMetrics.push(postData);
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Trigger an error
    await page.route('**/api/suppliers', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.click('[data-testid="search-suppliers"]');

    // Wait for error handling and metrics
    await page.waitForTimeout(1000);

    // Should have recorded error metrics
    expect(errorMetrics.length).toBeGreaterThan(0);
  });

  test('should handle concurrent errors without interference', async ({ page }) => {
    // Mock multiple failing endpoints
    await page.route('**/api/suppliers', route => {
      route.fulfill({ status: 500, body: 'Supplier service error' });
    });
    
    await page.route('**/api/orders', route => {
      route.fulfill({ status: 503, body: 'Order service unavailable' });
    });

    // Trigger multiple concurrent operations
    await Promise.all([
      page.click('[data-testid="search-suppliers"]'),
      page.click('[data-testid="view-orders"]'),
      page.click('[data-testid="refresh-data"]')
    ]);

    // Should handle all errors independently
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Application should remain functional
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should provide accessible error messages', async ({ page }) => {
    // Mock error response
    await page.route('**/api/suppliers', route => {
      route.fulfill({ status: 404, body: 'Not found' });
    });

    await page.click('[data-testid="search-suppliers"]');

    // Check accessibility attributes
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
  });

  test('should handle memory pressure gracefully', async ({ page }) => {
    // Simulate memory pressure by creating many objects
    await page.evaluate(() => {
      const largeArray: any[] = [];
      for (let i = 0; i < 100000; i++) {
        largeArray.push({ data: new Array(1000).fill(i) });
      }
      (window as any).testData = largeArray;
    });

    // Application should still be responsive
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Should be able to perform basic operations
    await page.click('[data-testid="home-link"]');
    await expect(page.locator('[data-testid="home-content"]')).toBeVisible();
  });
});