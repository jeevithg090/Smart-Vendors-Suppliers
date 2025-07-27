# Comprehensive Error Handling Guide

This guide explains how to use the comprehensive error handling system implemented in the vendor sourcing platform.

## Overview

The error handling system provides:
- Global error boundaries for React component errors
- Comprehensive error reporting and monitoring
- Retry mechanisms with circuit breakers
- Offline operation queuing
- Business logic validation
- Form validation with user-friendly messages
- Performance monitoring and error tracking

## Components

### 1. AppErrorProvider

Wrap your entire application with `AppErrorProvider` to enable comprehensive error handling:

```tsx
import { AppErrorProvider } from './components/AppErrorProvider';

function App() {
  return (
    <AppErrorProvider>
      <YourAppComponents />
    </AppErrorProvider>
  );
}
```

### 2. useAppError Hook

Use the `useAppError` hook in any component to access error handling capabilities:

```tsx
import { useAppError } from './components/AppErrorProvider';

function MyComponent() {
  const {
    executeOperation,
    validateBusinessLogic,
    validateForm,
    handleError,
    isLoading,
    error,
    canRetry,
    retry,
    clearError
  } = useAppError();

  const handleApiCall = async () => {
    try {
      const result = await executeOperation(
        () => fetch('/api/data').then(res => res.json()),
        'fetchData',
        { userId: 'user-123' }
      );
      // Handle success
    } catch (error) {
      // Error is automatically handled by the system
    }
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && (
        <div>
          <p>Error: {error.message}</p>
          {canRetry && <button onClick={retry}>Retry</button>}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
      <button onClick={handleApiCall}>Fetch Data</button>
    </div>
  );
}
```

### 3. ConvexErrorHandler

For Convex operations, use the `ConvexErrorHandler`:

```tsx
import { ConvexErrorHandler, convexUtils } from './utils/convexErrorHandler';
import { useQuery, useMutation } from 'convex/react';

function ConvexComponent() {
  // Safe query wrapper
  const data = convexUtils.safeQuery(
    useQuery(api.suppliers.list),
    'suppliersList'
  );

  // Safe mutation wrapper
  const createOrder = convexUtils.safeMutation(
    useMutation(api.orders.create),
    'createOrder'
  );

  const handleCreateOrder = async () => {
    try {
      await createOrder({ supplierId: 'supplier-1', items: [] });
    } catch (error) {
      // Error is automatically handled and converted to AppError
    }
  };

  return (
    <div>
      {data?.map(supplier => (
        <div key={supplier._id}>{supplier.businessName}</div>
      ))}
      <button onClick={handleCreateOrder}>Create Order</button>
    </div>
  );
}
```

### 4. FormField Component

Use the `FormField` component for consistent form validation:

```tsx
import { FormField } from './components/FormField';
import { useFormValidation } from './hooks/useFormValidation';
import { validationSchemas } from './utils/validation';

function RegistrationForm() {
  const {
    data,
    errors,
    handleSubmit,
    getFieldProps
  } = useFormValidation(
    { businessName: '', email: '', phone: '' },
    validationSchemas.vendorRegistration
  );

  const onSubmit = async (formData) => {
    // Submit form data
    console.log('Submitting:', formData);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit); }}>
      <FormField
        label="Business Name"
        name="businessName"
        required
        {...getFieldProps('businessName')}
      />
      
      <FormField
        label="Email"
        name="email"
        type="email"
        required
        {...getFieldProps('email')}
      />
      
      <FormField
        label="Phone"
        name="phone"
        type="tel"
        required
        {...getFieldProps('phone')}
      />
      
      <button type="submit">Register</button>
    </form>
  );
}
```

### 5. Business Logic Validation

Validate business logic before operations:

```tsx
import { useAppError } from './components/AppErrorProvider';

function OrderPlacement() {
  const { validateBusinessLogic } = useAppError();

  const handlePlaceOrder = async (orderData) => {
    try {
      // Validate business logic
      const validation = await validateBusinessLogic('orderPlacement', orderData);
      
      if (!validation.isValid) {
        // Errors are automatically handled and displayed
        return;
      }

      // Proceed with order placement
      await placeOrder(orderData);
    } catch (error) {
      // Error handling is automatic
    }
  };

  return (
    <div>
      {/* Order form */}
      <button onClick={() => handlePlaceOrder(orderData)}>
        Place Order
      </button>
    </div>
  );
}
```

## Error Types

The system handles several types of errors:

### 1. Network Errors
- Connection failures
- Timeouts
- Server errors
- Automatically retryable

### 2. Business Errors
- Insufficient stock
- Order expired
- Payment failed
- Include actionable suggestions

### 3. Validation Errors
- Form field validation
- Data format errors
- Required field errors

### 4. System Errors
- Database errors
- Service unavailable
- Permission errors

### 5. Authentication Errors
- Session expired
- Invalid credentials
- Unauthorized access

## Features

### Retry Mechanisms
- Automatic retry with exponential backoff
- Circuit breakers to prevent cascading failures
- Configurable retry policies

### Offline Support
- Operation queuing when offline
- Automatic sync when back online
- Visual indicators for offline status

### Performance Monitoring
- Error frequency tracking
- Performance impact measurement
- Memory usage monitoring
- API call performance

### Error Reporting
- Automatic error reporting to monitoring service
- Context preservation for debugging
- User-friendly error messages

## Configuration

### Environment Variables
```env
VITE_ERROR_REPORTING_ENABLED=true
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_RETRY_MAX_ATTEMPTS=3
VITE_RETRY_BASE_DELAY=1000
```

### Error Dashboard
Enable the error dashboard in development:
```javascript
localStorage.setItem('showErrorDashboard', 'true');
```

## Best Practices

### 1. Always Use Error Boundaries
Wrap components that might throw errors:
```tsx
<ErrorBoundary fallback={CustomErrorComponent}>
  <RiskyComponent />
</ErrorBoundary>
```

### 2. Provide Context
Always provide context when handling errors:
```tsx
await executeOperation(
  () => apiCall(),
  'operationName',
  { userId, orderId, timestamp }
);
```

### 3. Handle Business Logic Errors
Validate business logic before operations:
```tsx
const validation = await validateBusinessLogic('orderPlacement', data);
if (!validation.isValid) {
  // Show validation errors to user
  return;
}
```

### 4. Use Appropriate Error Types
Choose the right error type for the situation:
- Use `NetworkError` for connectivity issues
- Use `BusinessError` for business rule violations
- Use `ValidationError` for input validation
- Use `SystemError` for unexpected failures

### 5. Provide Recovery Actions
Include actionable suggestions in error messages:
```tsx
const error = {
  type: 'BUSINESS_ERROR',
  code: 'INSUFFICIENT_STOCK',
  message: 'Not enough stock available',
  suggestions: [
    'Reduce quantity',
    'Try a different supplier',
    'Join a group order'
  ]
};
```

## Testing

### Unit Tests
Test error handling logic:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AppErrorProvider } from './components/AppErrorProvider';

test('should handle errors gracefully', async () => {
  render(
    <AppErrorProvider>
      <ComponentThatMightError />
    </AppErrorProvider>
  );

  // Trigger error
  fireEvent.click(screen.getByText('Trigger Error'));

  // Verify error handling
  expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
});
```

### Integration Tests
Test error handling across components:
```tsx
test('should retry failed operations', async () => {
  // Mock failing then succeeding operation
  const mockOperation = jest.fn()
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValue('success');

  // Test retry behavior
  const result = await executeWithRetry(mockOperation);
  expect(result).toBe('success');
  expect(mockOperation).toHaveBeenCalledTimes(2);
});
```

### E2E Tests
Test error scenarios in real browser:
```typescript
test('should handle network failures gracefully', async ({ page }) => {
  // Simulate network failure
  await page.route('**/api/**', route => route.abort('failed'));

  // Verify error handling
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});
```

## Monitoring and Debugging

### Error Dashboard
The error dashboard provides real-time monitoring:
- Error frequency and types
- Performance metrics
- Offline queue status
- Memory usage

### Performance Metrics
Track key metrics:
- Error rates
- Response times
- Retry attempts
- Circuit breaker states

### Error Reporting
Errors are automatically reported with:
- Stack traces
- User context
- Performance data
- Device information

## Troubleshooting

### Common Issues

1. **Errors not being caught**
   - Ensure components are wrapped in ErrorBoundary
   - Check that async errors are properly handled

2. **Retry not working**
   - Verify retry conditions are met
   - Check circuit breaker state

3. **Offline queue not processing**
   - Verify online/offline event listeners
   - Check localStorage permissions

4. **Performance impact**
   - Monitor error handling overhead
   - Adjust retry policies if needed

### Debug Mode
Enable debug logging:
```javascript
localStorage.setItem('errorHandlingDebug', 'true');
```

This comprehensive error handling system ensures your application remains robust and user-friendly even when things go wrong.