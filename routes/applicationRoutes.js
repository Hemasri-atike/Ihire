import express from "express";
import multer from "multer";
import {
  createApplication,
  getApplications,
} from "../controllers/applicationController.js";

const router = express.Router();

// File upload config
const upload = multer({ dest: "uploads/" });

// Routes
router.post("/", upload.single("resume"), createApplication);
router.get("/", getApplications);

export default router;
