import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Job-related routes
router.get('/categories', authenticate, jobController.getCategories); // Must come before /:id
router.get('/', authenticate, jobController.getJobs);
router.get('/posted', authenticate, jobController.getPostedJobs);
router.get('/:id', authenticate, jobController.getJobById);
router.get('/:id/applicants', authenticate, jobController.getApplicantsByJob);
router.get('/by-category', authenticate, jobController.getJobsByCategory);
router.post('/:jobId/apply', authenticate, jobController.createJob);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);
router.post('/bulk-delete', authenticate, jobController.bulkDeleteJobs);
router.patch('/:id', authenticate, jobController.toggleJobStatus);
router.get('/analytics', authenticate, jobController.getAnalytics);
router.get('/interviews', authenticate, jobController.getInterviews);
router.post('/:jobId/apply', authenticate, jobController.applyToJob);

export default router;