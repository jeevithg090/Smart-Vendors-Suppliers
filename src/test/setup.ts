import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

const nativeFetch = globalThis.fetch?.bind(globalThis);
const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
  if (!nativeFetch) {
    return Promise.reject(new Error('Fetch is not available in the test environment.'));
  }
  return nativeFetch(...args);
});

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: fetchMock,
});

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Clean up after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
  server.resetHandlers();
  fetchMock.mockReset();
  fetchMock.mockImplementation((...args: Parameters<typeof fetch>) => {
    if (!nativeFetch) {
      return Promise.reject(new Error('Fetch is not available in the test environment.'));
    }
    return nativeFetch(...args);
  });
});

// Close server after all tests
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  configurable: true,
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: <T extends ArrayBufferView>(buffer: T): T => {
      const view = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    },
  },
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  writable: true,
  value: true,
});

// Mock Notification
class MockNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = vi.fn().mockResolvedValue('granted');
  title: string;
  options?: NotificationOptions;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
  }
}

Object.defineProperty(globalThis, 'Notification', {
  configurable: true,
  writable: true,
  value: MockNotification,
});

const createStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] || null),
    get length() {
      return store.size;
    },
  } as Storage;
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: createStorage(),
});

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  writable: true,
  value: createStorage(),
});
