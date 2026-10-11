import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as incomeController from "../controllers/incomeController.js";

const router = Router();

// Strict security: all income and treasury management routes require authentication
// and are strictly restricted to TREASURER and ADMIN roles.
router.use(requireAuth, requireRole("TREASURER", "ADMIN"));

// Overview & Settings
router.get("/overview", incomeController.getTreasuryOverview);
router.get("/settings", incomeController.getTreasurySettings);
router.put("/settings", incomeController.updateTreasurySettings);

// Installments
router.get("/installments/matrix", incomeController.getInstallmentsMatrix);
router.get("/installments/plans", incomeController.getInstallmentPlans);
router.post("/installments/plans", incomeController.createInstallmentPlan);
router.put("/installments/plans/:id", incomeController.updateInstallmentPlan);
router.delete("/installments/plans/:id", incomeController.deleteInstallmentPlan);
router.post("/installments/pay", incomeController.recordInstallmentPayment);
router.delete("/installments/pay/:id", incomeController.deleteInstallmentPayment);

// Workshops & Events
router.get("/events", incomeController.getEvents);
router.post("/events", incomeController.createEvent);
router.put("/events/:id", incomeController.updateEvent);
router.delete("/events/:id", incomeController.deleteEvent);

// Sponsors
router.get("/sponsors", incomeController.getSponsors);
router.post("/sponsors", incomeController.createSponsor);
router.put("/sponsors/:id", incomeController.updateSponsor);
router.delete("/sponsors/:id", incomeController.deleteSponsor);

// Miscellaneous
router.get("/misc", incomeController.getMisc);
router.post("/misc", incomeController.createMisc);
router.put("/misc/:id", incomeController.updateMisc);
router.delete("/misc/:id", incomeController.deleteMisc);

export default router;
