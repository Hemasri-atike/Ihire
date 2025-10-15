import express from "express";
import { getAllCandidates, getCandidateById, addCandidate,updateCandidate, candidateRegister, candidateLogin, getCandidateProfile } from "../controllers/candidatecontroller.js";
import upload from "../middleware/upload.js";


const router = express.Router();

router.get("/", getAllCandidates);
router.get("/:id", getCandidateById);
router.get('/profile', getCandidateProfile)
router.post("/register", candidateRegister);
router.post("/login", candidateLogin);
router.post("/add",  upload.single("resume"), addCandidate);
router.put("/", upload.single("resume"), updateCandidate);


export default router;
