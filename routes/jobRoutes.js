// routes/jobRoutes.js
import express from "express";
import jobController from "../controllers/jobcontroller.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticate, jobController.createJob); // Employer only
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);

export default router;