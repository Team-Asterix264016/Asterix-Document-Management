import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listToBuy,
  createToBuy,
  updateToBuy,
  deleteToBuy,
} from "../controllers/toBuyController.js";

const router = Router();

router.use(requireAuth);

router.get("/", listToBuy);
router.post("/", createToBuy);
router.patch("/:id", updateToBuy);
router.delete("/:id", deleteToBuy);

export default router;
