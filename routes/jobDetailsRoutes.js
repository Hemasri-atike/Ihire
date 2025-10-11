import express from "express";
import { createJob, getAllJobs } from "../controllers/jobDetailsController.js";
const router = express.Router();

router.post("/createJob",createJob)
router.get("/getAllJobs",getAllJobs)

export default router;