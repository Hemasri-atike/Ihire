import express from "express";
import applicantController from "../controllers/applicantcontroller.js";

const router = express.Router();

// Get all applicants
router.get("/", applicantController.getApplicants);

// Create new applicant
router.post("/", applicantController.createApplicant);

export default router;
