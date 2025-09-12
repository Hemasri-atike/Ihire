import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Job-related routes (authenticate all, requireEmployer only for employer actions)
router.get('/categories', authenticate, jobController.getCategories); // Public-ish, but auth for consistency
router.get('/', authenticate, jobController.getJobs); // All users
router.get('/posted', authenticate, jobController.requireEmployer, jobController.getPostedJobs); // Employers only
router.get('/:id', authenticate, jobController.requireEmployer, jobController.getJobById); // Employers only
router.get('/:id/applicants', authenticate, jobController.requireEmployer, jobController.getApplicantsByJob); // Employers only
router.get('/by-category', authenticate, jobController.getJobsByCategory); // All users
router.post('/:jobId/apply', authenticate, jobController.applyToJob); // Job seekers only - no requireEmployer!
router.put('/:id', authenticate, jobController.requireEmployer, jobController.updateJob); // Employers only
router.delete('/:id', authenticate, jobController.requireEmployer, jobController.deleteJob); // Employers only
router.post('/bulk-delete', authenticate, jobController.requireEmployer, jobController.bulkDeleteJobs); // Employers only
router.patch('/:id', authenticate, jobController.requireEmployer, jobController.toggleJobStatus); // Employers only
router.get('/analytics', authenticate, jobController.requireEmployer, jobController.getAnalytics); // Employers only
router.get('/interviews', authenticate, jobController.requireEmployer, jobController.getInterviews); // Employers only
router.get('/user', authenticate, jobController.getUserApplications); // Job seekers only - no requireEmployer!

export default router;