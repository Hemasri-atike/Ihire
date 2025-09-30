
// import express from 'express';
// import jobController from '../controllers/jobcontroller.js';
// import authenticate from '../middleware/auth.js';

// const router = express.Router();

// // Apply to a job (for job seekers)
// router.post('/', authenticate, jobController.applyToJob);

// // Get applications for a specific job (for employers)
// router.get('/:jobId', authenticate, jobController.getApplications);

// // Get user's applications (for job seekers)
// router.get('/', authenticate, jobController.getUserApplications);

// export default router;



import express from 'express';
import authenticate from '../middleware/auth.js';
import {
  createApplication,
  getApplications,
  getUserApplications,
  updateApplicationStatus,
} from '../controllers/applicationcontroller.js';

const router = express.Router();

// Job seeker applies to a job
router.post('/', authenticate, createApplication);

// Job seeker fetches their applied jobs
router.get('/user', authenticate, getUserApplications);



// Employer fetches applications for a specific job
router.get('/job/:jobId', authenticate, getApplications);

// Employer updates application status
router.put('/:applicationId/status', authenticate, updateApplicationStatus);

export default router;

