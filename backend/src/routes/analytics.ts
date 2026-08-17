import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { aiQuerySchema } from "../validators/analytics.js";
import * as analyticsController from "../controllers/analyticsController.js";

const router = Router();

router.use(requireAuth);

const aiQueryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI queries. Please try again later." },
});

router.get("/summary", analyticsController.summary);
router.get("/categories", analyticsController.categories);
router.get("/monthly", analyticsController.monthly);
router.get("/vendors", analyticsController.vendors);
router.get("/users", analyticsController.users);
router.get("/approvals", analyticsController.approvals);
router.post("/ai-query", aiQueryLimiter, validateBody(aiQuerySchema), analyticsController.queryBillsAi);

export default router;
