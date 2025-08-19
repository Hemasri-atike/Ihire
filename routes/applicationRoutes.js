import express from "express";
import multer from "multer";
import { createApplication, getApplications } from "../controllers/applicationController.js";

const router = express.Router();

// File upload config
const upload = multer({ dest: "uploads/" });

// ✅ POST /api/applications/apply
router.post("/apply", upload.single("resume"), createApplication);

// ✅ GET /api/applications
router.get("/", getApplications);

export default router;
