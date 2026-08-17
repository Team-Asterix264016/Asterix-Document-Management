import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as exportController from "../controllers/exportController.js";

const router = Router();

router.use(requireAuth, requireRole("TREASURER"));

router.get("/bills", exportController.exportBills);
router.get("/subsystem/:id", exportController.exportSubsystem);
router.get("/month/:year/:month", exportController.exportMonth);

export default router;
