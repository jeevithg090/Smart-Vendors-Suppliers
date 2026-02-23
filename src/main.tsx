import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider } from 'convex/react'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { AppErrorProvider } from './components/AppErrorProvider'

// Environment variables validation
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const DEFAULT_CONVEX_URL = 'https://notable-skunk-507.convex.cloud';
const RESOLVED_CONVEX_URL =
  CONVEX_URL && CONVEX_URL !== 'https://placeholder.convex.cloud'
    ? CONVEX_URL
    : DEFAULT_CONVEX_URL;

// Validate environment variables
if (!CONVEX_URL) {
  console.warn('Missing VITE_CONVEX_URL environment variable');
  console.warn('Using default production backend URL.');
}

console.log('Environment check:');
console.log('CONVEX_URL:', RESOLVED_CONVEX_URL);

// Create Convex client with better fallback handling
let convex: ConvexReactClient;

try {
  convex = new ConvexReactClient(RESOLVED_CONVEX_URL);
  console.log('✅ Convex client initialized successfully');
} catch (error) {
  console.warn('Failed to initialize Convex client:', error);
  convex = new ConvexReactClient(DEFAULT_CONVEX_URL);
}

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <BrowserRouter>
      <ConvexProvider client={convex}>
        <AppErrorProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppErrorProvider>
      </ConvexProvider>
    </BrowserRouter>
  </StrictMode>
)
