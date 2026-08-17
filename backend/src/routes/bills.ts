import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import {
  billQuerySchema,
  createDraftBillSchema,
  rejectBillSchema,
  submitBillSchema,
  updateBillSchema,
} from "../validators/bill.js";
import * as billController from "../controllers/billController.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(billQuerySchema), billController.listBills);
router.post("/", validateBody(createDraftBillSchema), billController.createDraft);
router.get("/:id", billController.getBill);
router.put("/:id", validateBody(updateBillSchema), billController.updateBill);
router.post("/:id/attachments", upload.array("files", 10), billController.uploadAttachments);
router.post("/:id/submit", validateBody(submitBillSchema), billController.submitBill);
router.post("/:id/approve", requireRole("TREASURER"), billController.approveBill);
router.post("/:id/reject", requireRole("TREASURER"), validateBody(rejectBillSchema), billController.rejectBill);

export default router;
