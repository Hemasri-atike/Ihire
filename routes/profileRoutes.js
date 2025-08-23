import express from "express";
import { getProfile, createProfile, updateProfile } from "../controllers/profileController.js"

const router = express.Router();

router.get("/", getProfile);    // GET /api/profile
router.post("/", createProfile); // POST /api/profile
router.put("/", updateProfile);  // PUT /api/profile

export default router;
