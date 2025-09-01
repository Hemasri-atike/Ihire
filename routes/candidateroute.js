import express from "express";
import { getAllCandidates, getCandidateById, addCandidate } from "../controllers/candidatecontroller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", getAllCandidates);
router.get("/:id", getCandidateById);
router.post("/", upload.single("resume"), addCandidate); // ✅ upload.single works

export default router;
