import type { Server } from "http";
import { createApp } from "./app.js";
import { connectDBWithRetry, disconnectDB } from "./config/db.js";
import { assertProductionEnv, env } from "./config/env.js";

function registerProcessGuards(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      console.error("Graceful shutdown timed out. Forcing exit.");
      process.exit(1);
    }, 15_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await disconnectDB();
      } catch (err) {
        console.error("Error closing MongoDB connection:", err);
      }
      clearTimeout(forceExit);
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // A rejected promise that nobody handled is a bug, but it must not silently
  // kill the process on Render — log it loudly and keep serving.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    shutdown("uncaughtException");
  });
}

function main(): void {
  console.log("Starting Asterix A-BAJA backend server...");
  assertProductionEnv();

  const app = createApp();

  // Listen first, connect second: the HTTP server must answer the platform
  // health check even while MongoDB is still unreachable, otherwise a database
  // blip turns into a failed deploy.
  const server = app.listen(env.port, () => {
    console.log(`Asterix A-BAJA 2027 backend listening on port ${env.port} (${env.nodeEnv})`);
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = 120_000;

  registerProcessGuards(server);
  connectDBWithRetry();
}

try {
  main();
} catch (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
}
