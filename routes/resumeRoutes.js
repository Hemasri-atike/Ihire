import express from "express";
import { getResume, updateResume } from "../controllers/resumeController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

// Get logged-in user's resume
router.get("/me", authenticate, getResume);

// Update logged-in user's resume
router.put("/me", authenticate, updateResume);

export default router;
