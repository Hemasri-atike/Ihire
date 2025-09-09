// routes/jobRoutes.js
import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import  authenticate from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Job routes
router.get('/jobs', jobController.getJobs);
router.get('/jobs/posted', authenticate, jobController.getPostedJobs);
router.get('/jobs/:id', authenticate, jobController.getJobById);
router.get('/jobs/:id/applicants', authenticate, jobController.getApplicantsByJob);
router.get('/jobs/by-category', authenticate, jobController.getJobsByCategory);
router.post('/jobs', authenticate, jobController.createJob);
router.put('/jobs/:id', authenticate, jobController.updateJob);
router.delete('/jobs/:id', authenticate, jobController.deleteJob);
router.post('/jobs/bulk-delete', authenticate, jobController.bulkDeleteJobs);
router.patch('/jobs/:id', authenticate, jobController.toggleJobStatus);
// router.post('/applications', authenticate, upload, jobController.applyToJob);
router.get('/applications', authenticate, jobController.getApplications);
router.get('/applications/user', authenticate, jobController.getUserApplications);
router.get('/jobs/categories', authenticate, jobController.getCategories);
router.get('/interviews', authenticate, jobController.getInterviews);
router.get('/analytics', authenticate, jobController.getAnalytics);

export default router;