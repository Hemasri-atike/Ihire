import express from "express";
import { getAllCandidates, getCandidateById, addCandidate } from "../controllers/candidatecontroller.js";

const router = express.Router();

// ✅ Routes
router.get("/", getAllCandidates); // Get all candidates
router.get("/:id", getCandidateById); // Get candidate by ID
router.post("/", addCandidate); // Add a new candidate

export default router;
