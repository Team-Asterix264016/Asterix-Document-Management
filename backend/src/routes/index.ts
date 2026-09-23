import { Router } from "express";
import { dbStatus, isDbConnected } from "../config/db.js";
import authRoutes from "./auth.js";
import billRoutes from "./bills.js";
import subsystemRoutes from "./subsystems.js";
import reportRoutes from "./reports.js";
import analyticsRoutes from "./analytics.js";
import exportRoutes from "./exports.js";
import userRoutes from "./users.js";

const router = Router();

// Liveness: the process is up. Must never depend on MongoDB, otherwise a
// database blip makes the platform kill a healthy deploy.
router.get("/health", (_req, res) =>
  res.json({ status: "ok", db: dbStatus(), time: new Date().toISOString() })
);

// Readiness: the API can actually serve data. Use this for smoke tests, not
// for the platform health check.
router.get("/health/ready", (_req, res) => {
  const ready = isDbConnected();
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not-ready",
    db: dbStatus(),
    time: new Date().toISOString(),
  });
});
router.use("/auth", authRoutes);
router.use("/bills", billRoutes);
router.use("/subsystems", subsystemRoutes);
router.use("/reports", reportRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/exports", exportRoutes);
router.use("/users", userRoutes);

export default router;
