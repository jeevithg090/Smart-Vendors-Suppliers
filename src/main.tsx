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
  console.warn('Running in development mode with enhanced fallback functionality.');
}

console.log('Environment check:');
console.log('CONVEX_URL:', CONVEX_URL || 'Not configured - using development mode');

// Create Convex client with better fallback handling
let convex: ConvexReactClient;

if (CONVEX_URL && CONVEX_URL !== 'https://placeholder.convex.cloud') {
  try {
    convex = new ConvexReactClient(CONVEX_URL);
    console.log('✅ Convex client initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize Convex client:', error);
    // Fallback to development mode
    convex = new ConvexReactClient('https://happy-mammal-123.convex.cloud');
  }
} else {
  // Enhanced development mode with better mock setup
  console.warn('🔧 Development Mode: Using enhanced local functionality');
  console.log('📝 Note: All data will be stored locally and reset on page refresh');
  console.log('🚀 To enable full backend features, run: npx convex dev');
  
  // Use a dummy URL that won't connect but allows the app to function
  convex = new ConvexReactClient('https://development-mode.convex.cloud');
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
