import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import authenticateJWT from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateJWT, getProfile);
router.put("/", authenticateJWT, updateProfile);

export default router;
