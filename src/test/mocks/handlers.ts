import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock error reporting endpoint
  http.post('/api/errors', () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock Convex endpoints
  http.post('*/api/query', ({ request }) => {
    return HttpResponse.json({ result: [] });
  }),

  http.post('*/api/mutation', ({ request }) => {
    return HttpResponse.json({ result: { id: 'test-id' } });
  }),

  // Mock authentication endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: { id: 'test-user', email: 'test@example.com' },
      token: 'test-token'
    });
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      user: { id: 'test-user', email: 'test@example.com' },
      token: 'test-token'
    });
  }),

  // Mock supplier endpoints
  http.get('/api/suppliers', () => {
    return HttpResponse.json([
      {
        id: 'supplier-1',
        businessName: 'Test Supplier',
        location: 'Mumbai',
        trustScore: 4.5,
        categories: ['vegetables']
      }
    ]);
  }),

  // Mock order endpoints
  http.post('/api/orders', () => {
    return HttpResponse.json({
      id: 'order-1',
      status: 'pending',
      totalCost: 100
    });
  }),

  // Network error simulation
  http.get('/api/network-error', () => {
    return HttpResponse.error();
  }),

  // Server error simulation
  http.get('/api/server-error', () => {
    return new HttpResponse(null, { status: 500 });
  }),
];