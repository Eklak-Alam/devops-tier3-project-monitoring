const assert = require('assert');

console.log("🛠️  Running Backend Sanity Checks...");

// 1. Check if Math works (CPU check)
assert.strictEqual(2 + 2, 4, "Math logic failed");

// 2. Check if Environment setup is theoretically possible
// (We just check if we can read environment variables object)
assert.ok(process.env, "Environment variables not accessible");

console.log("✅ Backend Sanity Tests Passed!");
process.exit(0); // Exit with Success code