import { defineConfig } from "vitest/config";

// Set before any test module imports ../src/config/env.ts, which reads these once at import time.
process.env.JWT_SECRET = "test-only-secret";
process.env.GEMINI_API_KEY = "test-key";
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
