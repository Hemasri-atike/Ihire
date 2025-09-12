import express from "express";
import { getAllCandidates, getCandidateById, addCandidate,updateCandidate } from "../controllers/candidatecontroller.js";
import upload from "../middleware/upload.js";
import authenticate from "../middleware/auth.js";


const router = express.Router();

router.get("/", getAllCandidates);
router.get("/:id", getCandidateById);
router.post("/add",  upload.single("resume"), addCandidate);
router.put("/", upload.single("resume"), updateCandidate); // Add PUT route

export default router;
