/// <reference types="vite/client" />
// Loads every Convex function module (plus _generated) so convex-test can run them in memory.
export const modules = import.meta.glob([
  '../../../convex/**/*.ts',
  '../../../convex/_generated/*.js',
  '!../../../convex/**/*.d.ts',
]);
