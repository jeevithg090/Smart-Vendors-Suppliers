import { query } from "./_generated/server";

// Simple test query to check if Convex is working
export const testConnection = query({
  args: {},
  handler: async () => {
    return { status: "connected", timestamp: Date.now(), message: "Hello from Convex!" };
  },
});

// Simple hello world query
export const helloWorld = query({
  args: {},
  handler: async () => {
    return { message: "Hello World from the backend!" };
  },
});

// Test auth configuration
export const testAuth = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      return {
        authConfigured: true,
        hasIdentity: !!identity,
        identity: identity ? {
          subject: identity.subject,
          issuer: identity.issuer
        } : null
      };
    } catch (error) {
      return {
        authConfigured: false,
        error: error.message,
        message: "Auth provider not configured properly"
      };
    }
  },
});
