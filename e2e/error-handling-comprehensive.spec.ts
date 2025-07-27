import { test, expect } from '@playwright/test';

test.describe('Comprehensive Error Handling E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock console to capture errors
    await page.addInitScript(() => {
      window.testErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        window.testErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await page.goto('/dashboard');

    // Try to perform an action that requires network
    await page.click('[data-testid="supplier-search-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');

    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Should not crash the application
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/vendor/register');

    // Submit form without required fields
    await page.click('[data-testid="submit-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="field-error-businessName"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-error-email"]')).toBeVisible();

    // Should not submit the form
    await expect(page.url()).toContain('/vendor/register');

    // Fill in valid data
    await page.fill('[data-testid="businessName-input"]', 'Test Business');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="phone-input"]', '9876543210');
    await page.fill('[data-testid="password-input"]', 'TestPassword123');

    // Errors should disappear
    await expect(page.locator('[data-testid="field-error-businessName"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="field-error-email"]')).not.toBeVisible();
  });

  test('should handle business logic errors', async ({ page }) => {
    await page.goto('/dashboard');

    // Mock insufficient stock response
    await page.route('**/api/orders', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock available',
          suggestions: ['Try a different supplier', 'Reduce quantity']
        })
      });
    });

    // Try to place an order
    await page.click('[data-testid="place-order-button"]');

    // Should show business error with suggestions
    await expect(page.locator('[data-testid="business-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="business-error"]')).toContainText('Not enough stock');
    await expect(page.locator('[data-testid="error-suggestions"]')).toContainText('Try a different supplier');
  });

  test('should handle component crashes with error boundary', async ({ page }) => {
    await page.goto('/dashboard');

    // Inject a script that will cause a component to crash
    await page.evaluate(() => {
      // Simulate a component error by throwing in a React component
      const errorEvent = new CustomEvent('test-component-error');
      window.dispatchEvent(errorEvent);
    });

    // Should show error boundary UI instead of white screen
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-boundary"]')).toContainText('Something went wrong');

    // Should show retry button
    await expect(page.locator('[data-testid="error-retry-button"]')).toBeVisible();

    // Should show error ID for support
    await expect(page.locator('[data-testid="error-id"]')).toBeVisible();
  });

  test('should handle offline scenarios', async ({ page, context }) => {
    await page.goto('/dashboard');

    // Go offline
    await context.setOffline(true);

    // Try to perform network operation
    await page.click('[data-testid="refresh-data-button"]');

    // Should show offline message
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('offline');

    // Should queue operations for when back online
    await page.click('[data-testid="create-order-button"]');
    await expect(page.locator('[data-testid="queued-operations"]')).toContainText('1 operation queued');

    // Go back online
    await context.setOffline(false);

    // Should process queued operations
    await expect(page.locator('[data-testid="queued-operations"]')).toContainText('0 operations queued');
  });

  test('should handle authentication errors', async ({ page }) => {
    // Mock expired session
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'SESSION_EXPIRED',
          message: 'Your session has expired'
        })
      });
    });

    await page.goto('/dashboard');

    // Try to perform authenticated action
    await page.click('[data-testid="profile-button"]');

    // Should redirect to login
    await expect(page.url()).toContain('/login');

    // Should show session expired message
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('session has expired');
  });

  test('should handle payment errors with recovery options', async ({ page }) => {
    await page.goto('/checkout');

    // Mock payment failure
    await page.route('**/api/payments', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'PAYMENT_FAILED',
          message: 'Payment could not be processed',
          suggestions: ['Try a different payment method', 'Check your card details']
        })
      });
    });

    // Fill payment form
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');

    // Submit payment
    await page.click('[data-testid="pay-button"]');

    // Should show payment error with recovery options
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('could not be processed');
    await expect(page.locator('[data-testid="payment-suggestions"]')).toContainText('different payment method');

    // Should allow trying again
    await expect(page.locator('[data-testid="retry-payment-button"]')).toBeVisible();
  });

  test('should track error metrics and performance', async ({ page }) => {
    // Mock analytics endpoint
    let analyticsData = [];
    await page.route('**/api/metrics', route => {
      analyticsData.push(route.request().postDataJSON());
      route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/dashboard');

    // Trigger an error
    await page.route('**/api/suppliers', route => {
      route.abort('failed');
    });

    await page.click('[data-testid="load-suppliers-button"]');

    // Wait for error handling
    await page.waitForTimeout(1000);

    // Should have sent analytics data
    expect(analyticsData.length).toBeGreaterThan(0);
    expect(analyticsData.some(data => 
      data.metric && data.metric.name === 'Error Occurred'
    )).toBe(true);
  });

  test('should handle rapid error recovery', async ({ page }) => {
    await page.goto('/dashboard');

    // Mock intermittent failures
    let requestCount = 0;
    await page.route('**/api/data', route => {
      requestCount++;
      if (requestCount <= 2) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: 'success' })
        });
      }
    });

    // Trigger operation that will fail then succeed
    await page.click('[data-testid="load-data-button"]');

    // Should show error initially
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Click retry
    await page.click('[data-testid="retry-button"]');

    // Should still show error on second attempt
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Click retry again
    await page.click('[data-testid="retry-button"]');

    // Should succeed on third attempt
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
  });

  test('should maintain application state during errors', async ({ page }) => {
    await page.goto('/dashboard');

    // Fill some form data
    await page.fill('[data-testid="search-input"]', 'test search');
    await page.selectOption('[data-testid="category-select"]', 'vegetables');

    // Trigger an error
    await page.route('**/api/search', route => {
      route.abort('failed');
    });

    await page.click('[data-testid="search-button"]');

    // Should show error but maintain form state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('test search');
    await expect(page.locator('[data-testid="category-select"]')).toHaveValue('vegetables');

    // Clear error and form should still work
    await page.click('[data-testid="clear-error-button"]');
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    
    // Form should still be functional
    await page.fill('[data-testid="search-input"]', 'updated search');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('updated search');
  });
});