
// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authenticate from './middleware/auth.js'; // Import authenticate middleware

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

dotenv.config();

const app = express();

// Middleware
app.use(cors({
 origin: ['http://localhost:3000', 'http://localhost:5173'],
 methods: ['GET', 'POST', 'PUT', 'DELETE'],
 allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Test route
app.get('/', (req, res) => res.send('Job Portal Backend running'));

// Routes (apply authenticate middleware to protected routes)
app.use('/api/header', headerRoutes); // Unprotected if public
app.use('/api/users', userRoutes); // May include login/register, so check if authentication is needed
app.use('/api/jobs', authenticate, jobRoutes);
app.use('/api/applications', authenticate, applicationRoutes); // Consolidated from duplicate
app.use('/api/applicants', authenticate, applicantRoutes);
app.use('/api/companies', authenticate, companyRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/candidates', authenticate, candidateRoutes);
app.use('/api/candidates/resume', authenticate, candidateResumeRoutes);
app.use('/api/jobalerts', authenticate, jobAlertRoutes);
app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/footer', footerRoute); // Unprotected if public
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/resume', authenticate, resumeRoutes);
app.use('/api/employees', authenticate, empRoutes);

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