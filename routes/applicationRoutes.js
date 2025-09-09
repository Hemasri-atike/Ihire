// import express from "express";
// import multer from "multer";
// import {
//   createApplication,
//   getApplications,
// } from "../controllers/applicationcontroller.js";

// const router = express.Router();

// // File upload config
// const upload = multer({ dest: "uploads/" });

// // Routes
// router.post("/", upload.single("resume"), createApplication);
// router.get("/", getApplications);


// export default router;
// routes/applicationRoutes.js
import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import authenticate from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Apply to a job (for job seekers)
router.post('/', authenticate, jobController.applyToJob);

// Get applications for a specific job (for employers)
router.get('/:jobId', authenticate, jobController.getApplications);

// Get user's applications (for job seekers)
router.get('/', authenticate, jobController.getUserApplications);

export default router;
