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
  console.error('Missing VITE_CONVEX_URL environment variable');
  console.error('Please run `npx convex dev` to set up Convex, or set the environment variable manually.');
}

console.log('Environment check:');
console.log('CONVEX_URL:', CONVEX_URL);

// Use Convex URL or placeholder
const convex = new ConvexReactClient(CONVEX_URL || 'https://placeholder.convex.cloud');

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
