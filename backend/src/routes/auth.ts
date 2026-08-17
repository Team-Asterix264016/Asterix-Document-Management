import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginHandler, meHandler } from "../controllers/authController.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema } from "../validators/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, validateBody(loginSchema), loginHandler);
router.get("/me", requireAuth, meHandler);

export default router;
