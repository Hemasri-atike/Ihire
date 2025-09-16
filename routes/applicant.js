import express from "express";
import {
  getApplicants,
  createApplicant,
  updateApplicantStatus,
  addApplicantNote,
  deleteApplicant,
} from "../controllers/applicantcontroller.js";

const router = express.Router();

// Define routes without duplicating /applicants
router.get("/applicants", getApplicants);
router.post("/applicants", createApplicant);
router.put("/applicants/:id/status", updateApplicantStatus);
router.post("/applicants/:id/notes", addApplicantNote);
router.delete("/applicants/:id", deleteApplicant);

export default router;