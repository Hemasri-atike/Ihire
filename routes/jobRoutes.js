import express from 'express';
import jobController from '../controllers/jobcontroller.js';
import authenticate from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'));
  },
}).fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
]);

const router = express.Router();

router.get('/skills', jobController.getSkills);
router.post('/skills/add', jobController.addSkill);
router.get('/by-category',  jobController.getJobsByCategoryOrSubcategory);

router.get('/getalljobs', jobController.getJobs);
router.get('/', jobController.getJobs);
router.get('/:jobId', jobController.getJobById);

router.get('/posted', authenticate, jobController.getPostedJobs);
// router.get('/:id', authenticate, jobController.getJobById);
router.get('/:jobId/applicants', authenticate, jobController.getApplicantsByJob);

router.post('/create-job', authenticate, jobController.createJob);
router.put('/:id/updatejob', authenticate, jobController.updateJob);
router.delete('/:id/deletejobs', authenticate, jobController.deleteJob);
router.post('/bulk-delete', authenticate, jobController.bulkDeleteJobs);
router.patch('/:id/toggle-status', authenticate, jobController.toggleJobStatus);


router.post('/:jobId/apply', authenticate, upload, jobController.applyToJob);
router.get('/user-applications', authenticate, jobController.getUserApplications);

export default router;
