import express from "express";
import { getResume, updateResume } from "../controllers/resumeController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

// Get logged-in user's resume
router.get("/getResume", getResume);

// Update or create logged-in user's resume
router.put("/", authenticate, updateResume);

export default router;