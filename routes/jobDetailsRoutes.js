import express from "express";
import { createJob, getAllJobs,getJobById } from "../controllers/jobDetailsController.js";
const router = express.Router();

router.post("/createJob",createJob)
router.get("/getAllJobs",getAllJobs)
router.get('/getJobById/:id', getJobById);

export default router;