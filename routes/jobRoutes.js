import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.get('/', jobController.getJobs);
router.get('/categories', jobController.getCategories);
router.get('/by-category', jobController.getJobsByCategory);
router.post('/', authenticate, jobController.createJob);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);
router.post('/:jobId/apply', jobController.applyToJob);
router.get('/:jobId/applications', authenticate, jobController.getApplications);
router.get('/applications', authenticate, jobController.getUserApplications);

export default router;