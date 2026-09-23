import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { ApiError } from "./utils/ApiError.js";

// Broad safety net so a single client cannot exhaust the free-tier instance.
// Per-route limiters (login, AI query) stay stricter than this.
const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health" || req.path === "/api/health/ready",
});

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Render terminates TLS at its proxy; without this, rate limiting and
  // req.secure see the proxy address instead of the client's.
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(compression());

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/non-browser callers (curl, health checks) send no Origin.
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, "");
        if (env.allowedOrigins.includes(normalized)) return callback(null, true);
        callback(ApiError.forbidden(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.use(globalLimiter);
  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
