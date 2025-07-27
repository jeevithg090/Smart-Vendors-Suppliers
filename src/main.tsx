import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider } from 'convex/react'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'

// Environment variables validation
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

// Validate environment variables
if (!CONVEX_URL) {
  console.warn('Missing VITE_CONVEX_URL environment variable');
  console.warn('Please run `npx convex dev` to set up Convex, or set the environment variable manually.');
  console.warn('Running in development mode with mock data.');
}

console.log('Environment check:');
console.log('CONVEX_URL:', CONVEX_URL);

// Use a valid deployment URL or create a development-only client
let convex: ConvexReactClient;

if (CONVEX_URL && CONVEX_URL !== 'https://placeholder.convex.cloud') {
  convex = new ConvexReactClient(CONVEX_URL);
} else {
  // For development without Convex setup, use a minimal mock
  console.warn('Using development mode - Convex features may not work');
  convex = new ConvexReactClient('https://happy-mammal-123.convex.cloud'); // Valid format but won't connect
}

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <BrowserRouter>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ConvexProvider>
    </BrowserRouter>
  </StrictMode>
)
