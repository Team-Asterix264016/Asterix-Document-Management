import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as analyticsController from "../controllers/analyticsController.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", analyticsController.summary);
router.get("/categories", analyticsController.categories);
router.get("/monthly", analyticsController.monthly);
router.get("/vendors", analyticsController.vendors);
router.get("/users", analyticsController.users);
router.get("/approvals", analyticsController.approvals);
router.post("/ai-query", analyticsController.queryBillsAi);

export default router;
