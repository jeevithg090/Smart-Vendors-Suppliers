import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { AppErrorProvider } from './components/AppErrorProvider';

// Public URL of the hosted demo backend; used when VITE_CONVEX_URL is not set.
const DEMO_CONVEX_URL = 'https://notable-skunk-507.convex.cloud';
const configuredUrl = import.meta.env.VITE_CONVEX_URL?.trim();

if (!configuredUrl && import.meta.env.DEV) {
  console.warn('VITE_CONVEX_URL is not set; falling back to the demo Convex backend.');
}

const convex = new ConvexReactClient(configuredUrl || DEMO_CONVEX_URL);

createRoot(document.getElementById('root')!).render(
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
  </StrictMode>,
);
