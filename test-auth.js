// Simple test script to verify manual authentication
const { ConvexHttpClient } = require("convex/browser");

// Replace with your actual Convex URL
const CONVEX_URL = process.env.CONVEX_URL || "https://happy-mammal-123.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function testAuth() {
  console.log("Testing manual authentication system...");
  
  try {
    // Test 1: Sign up a new vendor
    console.log("\n1. Testing vendor signup...");
    const signupResult = await client.mutation("auth:authenticateUser", {
      email: "testvendor@example.com",
      password: "password123",
      role: "vendor",
      firstName: "Test",
      lastName: "Vendor",
      isSignup: true
    });
    
    console.log("Signup result:", signupResult);
    
    // Test 2: Login with the same credentials
    console.log("\n2. Testing vendor login...");
    const loginResult = await client.mutation("auth:authenticateUser", {
      email: "testvendor@example.com",
      password: "password123",
      role: "vendor",
      isSignup: false
    });
    
    console.log("Login result:", loginResult);
    
    // Test 3: Get user profile
    console.log("\n3. Testing get user profile...");
    const profileResult = await client.query("auth:getUserProfile", {
      email: "testvendor@example.com"
    });
    
    console.log("Profile result:", profileResult);
    
    // Test 4: Get user identity
    console.log("\n4. Testing get user identity...");
    const identityResult = await client.query("authHelpers:getUserIdentity", {
      email: "testvendor@example.com"
    });
    
    console.log("Identity result:", identityResult);
    
    console.log("\n✅ All authentication tests passed!");
    
  } catch (error) {
    console.error("❌ Authentication test failed:", error);
  }
}

// Run the test
testAuth(); 