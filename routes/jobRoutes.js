
import express from "express";
import jobController from "../controllers/jobController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

// Public route (anyone can view jobs)
router.get("/", jobController.getJobs);

// Protected routes (only logged-in users can manage jobs)
router.post("/", authenticate, jobController.createJob);
router.put("/:id", authenticate, jobController.updateJob);
router.delete("/:id", authenticate, jobController.deleteJob);

export default router;
