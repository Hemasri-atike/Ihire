
import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Apply to a job (for job seekers)
router.post('/', authenticate, jobController.applyToJob);

// Get applications for a specific job (for employers)
router.get('/:jobId', authenticate, jobController.getApplications);

// Get user's applications (for job seekers)
router.get('/', authenticate, jobController.getUserApplications);

export default router;
