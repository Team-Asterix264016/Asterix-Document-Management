import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createSubsystemSchema, updateSubsystemSchema } from "../validators/subsystem.js";
import * as subsystemController from "../controllers/subsystemController.js";

const router = Router();

router.use(requireAuth);

router.get("/", subsystemController.listSubsystems);
router.post("/", validateBody(createSubsystemSchema), subsystemController.createSubsystem);
router.put("/:id", validateBody(updateSubsystemSchema), subsystemController.updateSubsystem);

export default router;
