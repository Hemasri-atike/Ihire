// controllers/jobcontroller.js
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { MulterError } from 'multer';

// Middleware to check if user is an employer
const requireEmployer = (req, res, next) => {
  if (!req.user || !['employer', 'admin'].includes(req.user.role)) {
    console.error(`requireEmployer: Unauthorized access, user=${JSON.stringify(req.user)}`);
    return res.status(403).json({ error: 'Unauthorized', details: 'Only employers or admins can access this resource' });
  }
  next();
};

// Get all jobs (with filtering and pagination)
const getJobs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 4, postedByUser } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    let baseQuery = 'SELECT * FROM jobs WHERE deleted_at IS NULL';
    let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE deleted_at IS NULL';
    const params = [];

    if (req.user?.role === 'employer' || postedByUser === 'true') {
      baseQuery += ' AND user_id = ?';
      countQuery += ' AND user_id = ?';
      params.push(userId);
    }

    if (status && status.toLowerCase() !== 'all') {
      baseQuery += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      baseQuery += ' AND (title LIKE ? OR company_name LIKE ?)';
      countQuery += ' AND (title LIKE ? OR company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [totalResult] = await pool.query(countQuery, params);
    const total = totalResult[0].total;

    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    const [jobs] = await pool.query(paginatedQuery, [...params, parseInt(limit), parseInt(offset)]);

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',').map((tag) => tag.trim()) : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(
            job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}'
          );
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      created_at: job.created_at,
      applicantCount: job.applicantCount || 0,
      views: job.views || 0,
    }));

    console.log(`GET /api/jobs: userId=${userId}, total=${total}, page=${page}, limit=${limit}`);
    res.json({
      jobs: jobsWithParsedJSON,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('getJobs Error:', err);
    res.status(500).json({ error: 'Error fetching jobs', details: err.message });
  }
};

// Get jobs posted by the user
const getPostedJobs = async (req, res) => {
  const userId = req.user?.id;

  try {
    console.log(`getPostedJobs: userId=${userId}`);
    const [jobs] = await pool.query(
      'SELECT * FROM jobs WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',').map((tag) => tag.trim()) : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(
            job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}'
          );
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      created_at: job.created_at,
      applicantCount: job.applicantCount || 0,
      views: job.views || 0,
    }));

    console.log(`GET /api/jobs/posted: userId=${userId}, found ${jobs.length} jobs`);
    res.json(jobsWithParsedJSON); // Return empty array if no jobs
  } catch (err) {
    console.error(`getPostedJobs Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: 'Error fetching posted jobs', details: err.message });
  }
};

// Get job by ID
const getJobById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    console.log(`getJobById: userId=${userId}, jobId=${id}`);
    const [jobs] = await pool.query(
      'SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    if (!jobs.length) {
      console.log(`GET /api/jobs/${id}: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const job = jobs[0];
    const jobWithParsedJSON = {
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',').map((tag) => tag.trim()) : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(
            job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}'
          );
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      created_at: job.created_at,
      applicantCount: job.applicantCount || 0,
      views: job.views || 0,
    };

    console.log(`GET /api/jobs/${id}: userId=${userId}, jobId=${id}`);
    res.json(jobWithParsedJSON);
  } catch (err) {
    console.error(`getJobById Error: id=${id}, error=`, err);
    res.status(500).json({ error: 'Error fetching job', details: err.message });
  }
};

// Get applicants for a job
const getApplicantsByJob = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    console.log(`getApplicantsByJob: userId=${userId}, jobId=${id}`);
    const [job] = await pool.query(
      'SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    if (!job.length) {
      console.log(`GET /api/jobs/${id}/applicants: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const columns = ['id', 'fullName AS name', 'email', 'status'];
    try {
      await pool.query('SELECT applied_at FROM applications LIMIT 1');
      columns.push('applied_at');
    } catch (err) {
      console.warn(`getApplicantsByJob: applied_at column not found, excluding from query`);
    }

    const [applicants] = await pool.query(
      `SELECT ${columns.join(', ')} FROM applications WHERE job_id = ?`,
      [id]
    );

    console.log(`GET /api/jobs/${id}/applicants: userId=${userId}, found ${applicants.length} applicants`);
    res.json(applicants);
  } catch (err) {
    console.error(`getApplicantsByJob Error: id=${id}, error=`, err);
    res.status(500).json({ error: 'Error fetching applicants', details: err.message });
  }
};

// Get all applicants for employer's jobs
const getApplications = async (req, res) => {
  const userId = req.user?.id;

  try {
    console.log(`getApplications: userId=${userId}`);
    const columns = ['a.id', 'a.fullName AS name', 'a.email', 'a.status', 'j.title AS jobTitle'];
    try {
      await pool.query('SELECT applied_at FROM applications LIMIT 1');
      columns.push('a.applied_at');
    } catch (err) {
      console.warn(`getApplications: applied_at column not found, excluding from query`);
    }

    const [applications] = await pool.query(
      `SELECT ${columns.join(', ')}
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.user_id = ? AND j.deleted_at IS NULL`,
      [userId]
    );

    console.log(`GET /api/applications: userId=${userId}, found ${applications.length} applications`);
    res.json(applications); // Return empty array if no applications
  } catch (err) {
    console.error(`getApplications Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: 'Error fetching applications', details: err.message });
  }
};

// Get interviews
const getInterviews = async (req, res) => {
  const userId = req.user?.id;

  try {
    console.log(`getInterviews: userId=${userId}`);
    const columns = ['a.id', 'a.fullName AS name', 'a.email', 'j.title AS jobTitle'];
    try {
      await pool.query('SELECT applied_at FROM applications LIMIT 1');
      columns.push('a.applied_at');
    } catch (err) {
      console.warn(`getInterviews: applied_at column not found, excluding from query`);
    }

    const [interviews] = await pool.query(
      `SELECT ${columns.join(', ')}
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.status = 'interview' AND j.user_id = ? AND j.deleted_at IS NULL`,
      [userId]
    );

    console.log(`GET /api/interviews: userId=${userId}, found ${interviews.length} interviews`);
    res.json(interviews); // Return empty array if no interviews
  } catch (err) {
    console.error(`getInterviews Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: 'Error fetching interviews', details: err.message });
  }
};

// Get analytics
const getAnalytics = async (req, res) => {
  const userId = req.user?.id;

  try {
    console.log(`getAnalytics: userId=${userId}`);
    const [analytics] = await pool.query(
      `SELECT COALESCE(SUM(j.views), 0) AS views, COALESCE(COUNT(DISTINCT a.id), 0) AS applicantCount
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.user_id = ? AND j.deleted_at IS NULL`,
      [userId]
    );

    console.log(`GET /api/analytics: userId=${userId}, analytics=`, analytics[0]);
    res.json({
      views: analytics[0].views || 0,
      applicantCount: analytics[0].applicantCount || 0,
    });
  } catch (err) {
    console.error(`getAnalytics Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: 'Error fetching analytics', details: err.message });
  }
};

// Get jobs by category
const getJobsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) {
      return res.status(400).json({ error: 'Category is required', details: 'Category query parameter is missing' });
    }

    const [jobs] = await pool.query(
      'SELECT * FROM jobs WHERE JSON_CONTAINS(tags, ?) AND deleted_at IS NULL',
      [JSON.stringify([category])]
    );
    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',').map((tag) => tag.trim()) : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(
            job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}'
          );
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      created_at: job.created_at,
      applicantCount: job.applicantCount || 0,
      views: job.views || 0,
    }));

    console.log(`GET /api/jobs/by-category: category=${category}, found ${jobs.length} jobs`);
    res.json({ jobs: jobsWithParsedJSON, total: jobs.length });
  } catch (err) {
    console.error('getJobsByCategory Error:', err);
    res.status(500).json({ error: 'Error fetching jobs by category', details: err.message });
  }
};

// Create a job
const createJob = async (req, res) => {
  const { title, company_name, description, category, status = 'Active', tags = [], salary, location } = req.body;
  const userId = req.user?.id;

  try {
    console.log(`createJob: userId=${userId}, jobData=`, req.body);
    if (!title || !company_name || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields', details: 'Title, company_name, description, and category are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs (user_id, title, company_name, description, category, status, tags, salary, location, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, title, company_name, description, category, status, JSON.stringify(tags), salary, location]
    );

    console.log(`POST /api/jobs: Created jobId=${result.insertId} for userId=${userId}`);
    res.status(201).json({ jobId: result.insertId, message: 'Job created successfully' });
  } catch (err) {
    console.error('createJob Error:', err);
    res.status(500).json({ error: 'Error creating job', details: err.message });
  }
};

// Update a job
const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, salary, company_name, status, tags, recruiterActions } = req.body;
  const userId = req.user?.id;

  try {
    console.log(`updateJob: userId=${userId}, jobId=${id}, jobData=`, req.body);
    const [job] = await pool.query(
      'SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    if (!job.length) {
      console.log(`PUT /api/jobs/${id}: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    await pool.query(
      `UPDATE jobs SET 
        title = ?, 
        description = ?, 
        location = ?, 
        salary = ?, 
        company_name = ?, 
        status = ?, 
        tags = ?, 
        recruiterActions = ? 
       WHERE id = ? AND user_id = ?`,
      [
        title || job[0].title,
        description || job[0].description,
        location || job[0].location,
        salary || job[0].salary,
        company_name || job[0].company_name,
        status || job[0].status,
        JSON.stringify(tags || JSON.parse(job[0].tags || '[]')),
        JSON.stringify(recruiterActions || JSON.parse(job[0].recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}')),
        id,
        userId,
      ]
    );

    console.log(`PUT /api/jobs/${id}: userId=${userId}`);
    res.json({ message: 'Job updated successfully' });
  } catch (err) {
    console.error(`updateJob Error: id=${id}, error=`, err);
    res.status(500).json({ error: 'Error updating job', details: err.message });
  }
};

// Delete a job
const deleteJob = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    console.log(`deleteJob: userId=${userId}, jobId=${id}`);
    const [job] = await pool.query(
      'SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    if (!job.length) {
      console.log(`DELETE /api/jobs/${id}: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    await pool.query('UPDATE jobs SET deleted_at = NOW() WHERE id = ? AND user_id = ?', [id, userId]);
    console.log(`DELETE /api/jobs/${id}: userId=${userId}`);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error(`deleteJob Error: id=${id}, error=`, err);
    res.status(500).json({ error: 'Error deleting job', details: err.message });
  }
};

// Bulk delete jobs
const bulkDeleteJobs = async (req, res) => {
  const { jobIds } = req.body;
  const userId = req.user?.id;

  try {
    console.log(`bulkDeleteJobs: userId=${userId}, jobIds=`, jobIds);
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'Invalid input', details: 'jobIds must be a non-empty array' });
    }

    const [jobs] = await pool.query(
      'SELECT id FROM jobs WHERE id IN (?) AND user_id = ? AND deleted_at IS NULL',
      [jobIds, userId]
    );
    const validJobIds = jobs.map((job) => job.id);
    const invalidJobIds = jobIds.filter((id) => !validJobIds.includes(id));

    if (invalidJobIds.length > 0) {
      console.log(`bulkDeleteJobs: Invalid job IDs for userId=${userId}`, invalidJobIds);
      return res.status(404).json({ error: 'Some jobs not found', details: `Invalid job IDs: ${invalidJobIds.join(', ')}` });
    }

    await pool.query('UPDATE jobs SET deleted_at = NOW() WHERE id IN (?) AND user_id = ?', [jobIds, userId]);
    console.log(`POST /api/jobs/bulk-delete: userId=${userId}, deleted jobIds=`, jobIds);
    res.json({ message: 'Jobs deleted successfully' });
  } catch (err) {
    console.error(`bulkDeleteJobs Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: 'Error deleting jobs', details: err.message });
  }
};

// Toggle job status
const toggleJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.id;

  try {
    console.log(`toggleJobStatus: userId=${userId}, jobId=${id}, newStatus=${status}`);
    const [job] = await pool.query(
      'SELECT status FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    if (!job.length) {
      console.log(`PATCH /api/jobs/${id}: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const newStatus = status;
    await pool.query(
      'UPDATE jobs SET status = ? WHERE id = ? AND user_id = ?',
      [newStatus, id, userId]
    );

    console.log(`PATCH /api/jobs/${id}: userId=${userId}, newStatus=${newStatus}`);
    res.json({ message: 'Job status updated successfully', status: newStatus });
  } catch (err) {
    console.error(`toggleJobStatus Error: id=${id}, error=`, err);
    res.status(500).json({ error: 'Error updating job status', details: err.message });
  }
};

// Get user applications
const getUserApplications = async (req, res) => {
  const { candidate_id } = req.query;
  const userId = req.user?.id;

  try {
    console.log(`getUserApplications: userId=${userId}, candidate_id=${candidate_id}`);
    if (req.user.role !== 'job_seeker' || parseInt(candidate_id) !== userId) {
      console.error(`GET /api/applications: Unauthorized access for userId=${userId}, candidate_id=${candidate_id}`);
      return res.status(403).json({ error: 'Unauthorized', details: 'You can only view your own applications' });
    }

    const columns = ['id', 'job_id', 'fullName AS name', 'email', 'status'];
    try {
      await pool.query('SELECT applied_at FROM applications LIMIT 1');
      columns.push('applied_at');
    } catch (err) {
      console.warn(`getUserApplications: applied_at column not found, excluding from query`);
    }

    const [applications] = await pool.query(
      `SELECT ${columns.join(', ')} FROM applications WHERE candidate_id = ?`,
      [candidate_id]
    );

    console.log(`GET /api/applications: userId=${userId}, found ${applications.length} applications`);
    res.json(applications);
  } catch (err) {
    console.error(`getUserApplications Error: candidate_id=${candidate_id}, error=`, err);
    res.status(500).json({ error: 'Error fetching user applications', details: err.message });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const [jobs] = await pool.query('SELECT tags FROM jobs WHERE deleted_at IS NULL');
    const allTags = jobs
      .flatMap((job) => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',').map((tag) => tag.trim()) : [];
        }
      })
      .filter((tag) => tag)
      .map((tag) => tag.trim());
    const uniqueCategories = [...new Set(allTags)];

    console.log(`GET /api/jobs/categories: found ${uniqueCategories.length} categories`);
    res.json(uniqueCategories);
  } catch (err) {
    console.error('getCategories Error:', err);
    res.status(500).json({ error: 'Error fetching categories', details: err.message });
  }
};

// Apply to a job
const applyToJob = async (req, res) => {
  try {
    const {
      job_id,
      candidate_id,
      fullName,
      email,
      phone,
      location,
      experience,
      jobTitle,
      company,
      qualification,
      specialization,
      university,
      skills,
      linkedIn,
      portfolio,
      status,
    } = req.body;

    const finalCandidateId = req.user?.id || candidate_id;
    if (!finalCandidateId || req.user?.role !== 'job_seeker') {
      console.error(`POST /api/applications: Authentication failed, user=${JSON.stringify(req.user)}`);
      return res.status(401).json({
        error: 'Authentication required',
        details: 'You must be logged in as a job seeker to apply',
      });
    }

    if (!job_id || !fullName || !email || !phone || !req.files?.resume) {
      console.error(`POST /api/applications: Missing required fields, job_id=${job_id}`);
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'job_id, fullName, email, phone, and resume are required',
      });
    }

    const jobIdNum = parseInt(job_id, 10);
    if (isNaN(jobIdNum)) {
      console.error(`POST /api/applications: Invalid job_id=${job_id}`);
      return res.status(400).json({
        error: 'Invalid job_id',
        details: 'job_id must be a valid number',
      });
    }

    const candidateIdNum = parseInt(finalCandidateId, 10);
    if (isNaN(candidateIdNum)) {
      console.error(`POST /api/applications: Invalid candidate_id=${finalCandidateId}`);
      return res.status(400).json({
        error: 'Invalid candidate_id',
        details: 'candidate_id must be a valid number',
      });
    }

    const [jobExists] = await pool.query('SELECT id FROM jobs WHERE id = ? AND deleted_at IS NULL', [jobIdNum]);
    if (!jobExists.length) {
      console.error(`POST /api/applications: Job not found, job_id=${jobIdNum}`);
      return res.status(400).json({
        error: 'Invalid job_id',
        details: `Job with ID ${job_id} does not exist`,
      });
    }

    const [userExists] = await pool.query('SELECT id FROM users WHERE id = ?', [candidateIdNum]);
    if (!userExists.length) {
      console.error(`POST /api/applications: User not found, candidate_id=${candidateIdNum}`);
      return res.status(400).json({
        error: 'Invalid candidate_id',
        details: `User with ID ${finalCandidateId} does not exist`,
      });
    }

    const [existingApp] = await pool.query(
      'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
      [jobIdNum, candidateIdNum]
    );
    if (existingApp.length) {
      console.error(`POST /api/applications: Duplicate application, job_id=${jobIdNum}, candidate_id=${candidateIdNum}`);
      return res.status(400).json({
        error: 'Application already exists',
        details: 'You have already applied to this job',
      });
    }

    const resume_path = req.files?.resume ? `resumes/${req.files.resume[0].filename}` : null;
    const coverLetter_path = req.files?.coverLetter ? `coverLetters/${req.files.coverLetter[0].filename}` : null;

    const columns = [
      'job_id', 'candidate_id', 'fullName', 'email', 'phone', 'location', 'experience',
      'jobTitle', 'company', 'qualification', 'specialization', 'university', 'skills',
      'coverLetter', 'linkedIn', 'portfolio', 'resume', 'status', 'applied_at'
    ];
    const values = [
      jobIdNum, candidateIdNum, fullName, email, phone || null, location || null,
      experience ? parseInt(experience, 10) : null, jobTitle || null, company || null,
      qualification || null, specialization || null, university || null, skills || null,
      coverLetter_path, linkedIn || null, portfolio || null, resume_path, status || 'applied',
      'NOW()'
    ];

    try {
      await pool.query('SELECT applied_at FROM applications LIMIT 1');
    } catch (err) {
      console.warn(`applyToJob: applied_at column not found, excluding from insert`);
      columns.pop(); // Remove applied_at
      values.pop(); // Remove NOW()
    }

    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await pool.query(
      `INSERT INTO applications (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    console.log(`POST /api/applications: job_id=${jobIdNum}, candidate_id=${candidateIdNum}, applicationId=${result.insertId}`);
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: result.insertId,
    });
  } catch (err) {
    console.error(`POST /api/applications: Backend error`, err);
    let errorDetails = err.message;
    if (err instanceof MulterError) {
      errorDetails = `File upload error: ${err.message}`;
      return res.status(400).json({ error: 'File upload error', details: errorDetails });
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      errorDetails = 'Invalid job_id or candidate_id. Ensure the job and user exist.';
    } else if (err.code === 'ER_DUP_ENTRY') {
      errorDetails = 'Application already exists for this job.';
    } else if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage.includes('applied_at')) {
      errorDetails = 'Database schema error: applied_at column missing.';
    }
    res.status(500).json({
      error: 'Error creating application',
      details: errorDetails,
    });
  }
};

// Export routes with middleware
export default {
  getJobs,
  getPostedJobs: [requireEmployer, getPostedJobs],
  getJobById: [requireEmployer, getJobById],
  getApplicantsByJob: [requireEmployer, getApplicantsByJob],
  getJobsByCategory,
  createJob: [requireEmployer, createJob],
  updateJob: [requireEmployer, updateJob],
  deleteJob: [requireEmployer, deleteJob],
  bulkDeleteJobs: [requireEmployer, bulkDeleteJobs],
  toggleJobStatus: [requireEmployer, toggleJobStatus],
  applyToJob,
  getApplications: [requireEmployer, getApplications],
  getUserApplications,
  getCategories,
  getInterviews: [requireEmployer, getInterviews],
  getAnalytics: [requireEmployer, getAnalytics],
};