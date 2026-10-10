import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listInventory,
  getInventoryStats,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  updateCustody,
  toggleMissing,
  deleteInventoryItem,
  getTeamMembers,
} from "../controllers/inventoryController.js";

const router = Router();

router.use(requireAuth);

router.get("/team-members", getTeamMembers);
router.get("/stats", getInventoryStats);
router.get("/", listInventory);
router.get("/:id", getInventoryItem);
router.post("/", createInventoryItem);
router.put("/:id", updateInventoryItem);
router.patch("/:id/custody", updateCustody);
router.patch("/:id/missing", toggleMissing);
router.delete("/:id", deleteInventoryItem);

export default router;
