import { defineConfig } from "vitest/config";

// Set before any test module imports ../src/config/env.ts, which reads these once at import time.
process.env.JWT_SECRET = "test-only-secret";
process.env.GEMINI_API_KEY = "test-key";
process.env.NODE_ENV = "test";
process.env.MAX_UPLOAD_MB = "1";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Each test file spins up its own mongodb-memory-server instance; running many files'
    // worth of mongod processes fully in parallel was intermittently exhausting resources on
    // constrained machines/CI runners and crashing a worker mid-run. Sequential file execution
    // trades some wall-clock time for a suite that doesn't flake for infrastructure reasons.
    fileParallelism: false,
  },
});
