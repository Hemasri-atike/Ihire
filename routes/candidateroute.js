import express from "express";
import { getAllCandidates, getCandidateById, addCandidate,updateCandidate } from "../controllers/candidatecontroller.js";
import upload from "../middleware/upload.js";


const router = express.Router();

router.get("/",  getAllCandidates);
router.get("/:id",  getCandidateById);
router.post("/", upload.single("resume"), addCandidate);
router.put("/",  upload.single("resume"), updateCandidate); // Added PUT route

export default router;
