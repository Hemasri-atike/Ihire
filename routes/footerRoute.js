import express from "express";
import footerController from "../controllers/footercontroller.js";

const router = express.Router();

// Public route: Get footer
router.get("/", footerController.getFooter);

// Admin routes: Create or update footer
router.post("/", footerController.createFooter);
router.put("/:section", footerController.updateFooter);

export default router;
