

import express from 'express';
import authenticate from '../middleware/auth.js';
import {
  createApplication,
  getApplications,
  getUserApplications,
  updateApplicationStatus,
  getApplicantsByUserJobs,
  getApplicantsByJob,
  updateApplicantStatus,
  addApplicantNote,
  scheduleInterview,
  deleteApplicant

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
router.get("/applicants/job/:jobId", getApplicantsByJob);

// Fetch applicants for all jobs posted by a specific employer
router.get("/jobs/applicants/user/:userId", getApplicantsByUserJobs);


router.put("/applicants/:id/status", authenticate, updateApplicantStatus);
router.put("/applicants/:id/notes", authenticate, addApplicantNote);
router.put("/applicants/:id/interview", authenticate, scheduleInterview);
router.delete("/applicants/:id", authenticate, deleteApplicant);

export default router;

