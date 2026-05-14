#!/usr/bin/env node
/**
 * Test script to verify Vite env variables are loaded correctly
 * Run: node test-env.js
 */

// Load .env.local when running this script directly for convenience
try {
  require("dotenv").config({ path: ".env.local" });
} catch (e) {
  // dotenv may not be installed; ignore
}

console.log("\n🔍 Checking environment variables...\n");

console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL || "❌ NOT SET");
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "✅ SET (hidden for security)" : "❌ NOT SET");

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.log("\n⚠️  Environment variables not found!");
  console.log("\n📝 Steps to fix:");
  console.log("1. Open .env.local");
  console.log("2. Replace YOUR-PROJECT-REF with your Supabase project reference");
  console.log("3. Replace YOUR-ANON-PUBLIC-KEY with your anon public key");
  console.log("4. Save the file");
  console.log("5. Run: npm run dev\n");
} else {
  console.log("\n✅ Environment variables loaded successfully!");
  console.log("\n🚀 You can now run: npm run dev\n");
}
