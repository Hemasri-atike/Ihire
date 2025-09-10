import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authenticate from './middleware/auth.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';

// Routes
import headerRoutes from './routes/headerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import applicantRoutes from './routes/applicant.js';
import companyRoutes from './routes/companyRoutes.js';
import dashboardRoutes from './routes/dashboardroutes.js';
import candidateRoutes from './routes/candidateroute.js';
import candidateResumeRoutes from './routes/resumeRoutes.js';
import jobAlertRoutes from './routes/jobalertRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import footerRoute from './routes/footerRoute.js';
import profileRoutes from './routes/profileRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import empRoutes from './routes/empRoutes.js';
import subcategoryRoutes from './routes/subcategoryRoutes.js'

dotenv.config();

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      cb(null, path.join(__dirname, 'Uploads/resumes'));
    } else if (file.fieldname === 'coverLetter') {
      cb(null, path.join(__dirname, 'Uploads/coverLetters'));
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const app = express();

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: '*',
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => res.send('Job Portal Backend running'));

// Routes
app.use('/api/header', headerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', authenticate, jobRoutes);
app.use('/api/applications', authenticate, upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
]), applicationRoutes);
app.use('/api/applicants', authenticate, applicantRoutes);
app.use('/api/companies', authenticate, companyRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/candidates', authenticate, candidateRoutes);
app.use('/api/candidates/resume', authenticate, candidateResumeRoutes);
app.use('/api/jobalerts', authenticate, jobAlertRoutes);
app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/footer', footerRoute);
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/resume', authenticate, resumeRoutes);
app.use('/api/employees', authenticate, empRoutes);
app.use('/api/subcategories', authenticate, subcategoryRoutes);
// app.use('/api/subcategories', subcategoryRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(`Error: ${req.method} ${req.url}`, err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Catch-all for unmatched routes
app.use((req, res) => {
  console.error(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found', details: 'Route does not exist' });
});

// Test database connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));