/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'dist/**'],
    css: true,
    // Dummy credentials so services initialise in tests; all network calls are mocked.
    env: {
      VITE_SARVAM_API_KEY: 'test-sarvam-key',
      VITE_OPENROUTER_API_KEY: 'test-openrouter-key',
      VITE_GOOGLE_TRANSLATE_API_KEY: 'test-translate-key',
      VITE_VISION_API_KEY: 'test-vision-key',
      VITE_CLARIFAI_API_KEY: 'test-clarifai-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
      ],
    },
  },
});
