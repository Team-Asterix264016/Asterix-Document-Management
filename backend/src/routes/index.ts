import { Router } from "express";
import authRoutes from "./auth.js";
import billRoutes from "./bills.js";
import subsystemRoutes from "./subsystems.js";
import reportRoutes from "./reports.js";
import analyticsRoutes from "./analytics.js";
import exportRoutes from "./exports.js";
import userRoutes from "./users.js";
import inventoryRoutes from "./inventory.js";
import toBuyRoutes from "./toBuy.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
router.use("/auth", authRoutes);
router.use("/bills", billRoutes);
router.use("/subsystems", subsystemRoutes);
router.use("/reports", reportRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/exports", exportRoutes);
router.use("/users", userRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/to-buy", toBuyRoutes);

export default router;
