import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getUsers,
  resetPassword,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/", asyncHandler(getUsers));
router.post("/", asyncHandler(createUser));
router.put("/:id", asyncHandler(updateUser));
router.delete("/:id", asyncHandler(deleteUser));
router.patch("/:id/password", asyncHandler(resetPassword));

export default router;
