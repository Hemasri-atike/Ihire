import  pool  from '../config/db.js'; 
import fs from 'fs';
import path from 'path';
import { MulterError } from 'multer';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    const { statusFilter = 'All', searchQuery = '', page = 1, jobsPerPage = 10, postedByUser, userId } = req.query;
    const offset = (page - 1) * jobsPerPage;
    const authUserId = req.user?.id;

    let baseQuery = 'SELECT * FROM jobs WHERE deleted_at IS NULL';
    let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE deleted_at IS NULL';
    const params = [];

    // Filter by user_id if user is an employer or postedByUser is true
    if (req.user?.role === 'employer' || postedByUser === 'true' || userId) {
      const filterUserId = userId || authUserId;
      if (filterUserId) {
        baseQuery += ' AND user_id = ?';
        countQuery += ' AND user_id = ?';
        params.push(filterUserId);
      }
    }

    // Handle status filter
    if (statusFilter && statusFilter.toLowerCase() !== 'all') {
      baseQuery += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(statusFilter);
    }

    // Handle search query
    if (searchQuery) {
      baseQuery += ' AND (title LIKE ? OR company_name LIKE ?)';
      countQuery += ' AND (title LIKE ? OR company_name LIKE ?)';
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    const [totalResult] = await pool.query(countQuery, params);
    const total = totalResult[0].total;

    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    const [jobs] = await pool.query(paginatedQuery, [...params, parseInt(jobsPerPage), parseInt(offset)]);

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

    console.log(`GET /api/jobs: userId=${authUserId}, total=${total}, page=${page}, limit=${jobsPerPage}, params=${JSON.stringify(req.query)}`);
    res.json({
      jobs: jobsWithParsedJSON,
      total,
      page: parseInt(page),
      limit: parseInt(jobsPerPage),
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
    res.json(jobsWithParsedJSON);
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

// Get all applications for employer's jobs
const getApplications = async (req, res) => {
  const userId = req.user?.id;

  try {
    console.log(`getApplications: userId=${userId}`);
    const columns = ['a.id', 'a.fullName AS name', 'a.email', 'a.status', 'j.title AS jobTitle', 'a.job_id', 'a.candidate_id'];
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
    res.json(applications);
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
    const columns = ['a.id', 'a.fullName AS name', 'a.email', 'j.title AS jobTitle', 'a.job_id', 'a.candidate_id'];
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
    res.json(interviews);
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
      'SELECT * FROM jobs WHERE category = ? AND deleted_at IS NULL',
      [category]
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
// const createJob = async (req, res) => {
//   const { title, company_name, description, category, status = 'Active', tags = [], salary, location } = req.body;
//   const userId = req.user?.id;

//   try {
//     console.log(`createJob: userId=${userId}, jobData=`, req.body);
//     if (!title || !company_name || !description || !category) {
//       return res.status(400).json({ error: 'Missing required fields', details: 'Title, company_name, description, and category are required' });
//     }

//     const [result] = await pool.query(
//       `INSERT INTO jobs (user_id, title, company_name, description, category, status, tags, salary, location, created_at)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//       [userId, title, company_name, description, category, status, JSON.stringify(tags), salary, location]
//     );

//     console.log(`POST /api/jobs: Created jobId=${result.insertId} for userId=${userId}`);
//     res.status(201).json({ jobId: result.insertId, message: 'Job created successfully' });
//   } catch (err) {
//     console.error('createJob Error:', err);
//     res.status(500).json({ error: 'Error creating job', details: err.message });
//   }
// };


const createJob = async (req, res) => {
  const { title, company_name, description, category, tags = [], salary, location } = req.body;
  const userId = req.user?.id;
  const requestId = req.headers['x-request-id'] || Date.now(); // Use a request ID if provided

  try {
    console.log(`createJob: requestId=${requestId}, userId=${userId}, jobData=`, req.body);
    if (!title || !company_name || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields', details: 'Title, company_name, description, and category are required' });
    }

    const [existingJob] = await pool.query(
      'SELECT id FROM jobs WHERE user_id = ? AND title = ? AND company_name = ? AND deleted_at IS NULL',
      [userId, title, company_name]
    );

    if (existingJob.length > 0) {
      console.error(`POST /api/jobs: Duplicate job detected, requestId=${requestId}, userId=${userId}, title=${title}, company_name=${company_name}`);
      return res.status(400).json({ error: 'Duplicate job', details: 'A job with the same title and company already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs (user_id, title, company_name, description, category, tags, salary, location, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, title, company_name, description, category, JSON.stringify(tags), salary, location]
    );

    console.log(`POST /api/jobs: Created jobId=${result.insertId}, requestId=${requestId}, userId=${userId}`);
    res.status(201).json({ jobId: result.insertId, message: 'Job created successfully' });
  } catch (err) {
    console.error(`createJob Error: requestId=${requestId}, userId=${userId}, error=`, err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Duplicate job', details: 'A job with the same title and company already exists' });
    }
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



const getUserApplications = async (req, res) => {
  try {
    const candidate_id = req.user?.id;
    const { search, status, page = 1, limit = 10 } = req.query;

    console.log('getUserApplications received:', {
      user: req.user,
      query: { search, status, page, limit },
    });

    if (!candidate_id) {
      console.error('GET /api/jobs/user-applications: Missing candidate_id');
      return res.status(401).json({
        error: 'Authentication required',
        details: 'User ID is missing',
      });
    }

    if (req.user.role !== 'job_seeker') {
      console.error(`GET /api/jobs/user-applications: Unauthorized, user_id=${candidate_id}, role=${req.user.role}`);
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Only job seekers can access their applied jobs',
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `
      SELECT a.*, j.title, j.company_name, j.location, j.salary, j.tags
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ? AND j.deleted_at IS NULL
    `;
    const params = [candidate_id];

    if (status && status !== 'All') {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (j.title LIKE ? OR j.company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ? AND j.deleted_at IS NULL
      ${status && status !== 'All' ? ' AND a.status = ?' : ''}
      ${search ? ' AND (j.title LIKE ? OR j.company_name LIKE ?)' : ''}
    `;
    const countParams = status && status !== 'All' ? [candidate_id, status, ...(search ? [`%${search}%`, `%${search}%`] : [])] : [candidate_id, ...(search ? [`%${search}%`, `%${search}%`] : [])];

    query += ' ORDER BY a.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [applications] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    console.log(`GET /api/jobs/user-applications: candidate_id=${candidate_id}, page=${page}, limit=${limit}, total=${total}, applications=`, applications);
    res.status(200).json({
      jobs: applications,
      total,
    });
  } catch (err) {
    console.error(`GET /api/jobs/user-applications: Backend error`, err);
    res.status(500).json({
      error: 'Error fetching user applications',
      details: err.message,
    });
  }
};





// Get categories
export const getCategories = async (req, res) => {
  try {
    const [jobs] = await pool.query('SELECT category FROM jobs WHERE deleted_at IS NULL');
    const uniqueCategories = [...new Set(jobs.map((job) => job.category).filter((category) => category))];

    console.log(`GET /api/jobs/categories: userId=${req.user?.id}, found ${uniqueCategories.length} categories`, uniqueCategories);
    res.json(uniqueCategories);
  } catch (err) {
    console.error('getCategories Error:', { userId: req.user?.id, error: err.message });
    res.status(500).json({ error: 'Error fetching categories', details: err.message });
  }
};

// Get applicants by job
export const getApplicantsByJob = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!id || isNaN(Number(id))) {
      console.error(`getApplicantsByJob: Invalid jobId=${id}, userId=${userId}`);
      return res.status(400).json({ error: 'Invalid job ID', details: 'Job ID must be a valid number' });
    }

    console.log(`getApplicantsByJob: userId=${userId}, jobId=${id}`);

    const [job] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [Number(id), userId]
    );
    if (!job.length) {
      console.log(`GET /api/jobs/${id}/applicants: No job found for userId=${userId}, jobId=${id}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const columns = [
      'id',
      'fullName AS name',
      'email',
      'status',
      'job_id',
      'candidate_id',
      'phone',
      'location',
      'experience',
      'jobTitle',
      'company',
      'qualification',
      'specialization',
      'university',
      'skills',
      'resume',
      'coverLetter',
      'linkedIn',
      'portfolio',
      'created_at AS applied_at', // Match database column name
    ];

    const [applicants] = await pool.query(
      `SELECT ${columns.join(', ')} FROM applications WHERE job_id = ?`,
      [Number(id)]
    );

    const normalizedApplicants = applicants.map((applicant) => ({
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      status: applicant.status || 'applied',
      job_id: applicant.job_id,
      candidate_id: applicant.candidate_id,
      phone: applicant.phone || null,
      location: applicant.location || null,
      experience: applicant.experience || null,
      jobTitle: applicant.jobTitle || null,
      company: applicant.company || null,
      qualification: applicant.qualification || null,
      specialization: applicant.specialization || null,
      university: applicant.university || null,
      skills: applicant.skills || null,
      resume: applicant.resume || null,
      coverLetter: applicant.coverLetter || null,
      linkedIn: applicant.linkedIn || null,
      portfolio: applicant.portfolio || null,
      applied_at: applicant.applied_at ? new Date(applicant.applied_at).toISOString() : null,
    }));

    console.log(`GET /api/jobs/${id}/applicants: userId=${userId}, found ${normalizedApplicants.length} applicants`);
    res.json(normalizedApplicants);
  } catch (err) {
    console.error(`getApplicantsByJob Error: jobId=${id}, userId=${userId}, error=`, err.message);
    res.status(500).json({ error: 'Error fetching applicants', details: err.message });
  }
};



// Apply to a job
const applyToJob = async (req, res) => {
  let jobId; // Declare jobId at the top to avoid ReferenceError in catch block
  try {
    jobId = req.params.jobId; // Extract jobId from URL params
    const {
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
    const resume = req.files?.resume ? path.join('uploads', req.files.resume[0].filename) : null;
    const coverLetter = req.files?.coverLetter ? path.join('uploads', req.files.coverLetter[0].filename) : null;
    const candidate_id = req.user?.id;

    console.log('applyToJob received:', {
      params: req.params,
      body: req.body,
      files: req.files,
      user: req.user,
    });

    if (!req.user || req.user.role !== 'job_seeker') {
      console.error(`POST /api/jobs/${jobId}/apply: Authentication failed, user=${JSON.stringify(req.user)}`);
      return res.status(401).json({
        error: 'Authentication required',
        details: 'You must be logged in as a job seeker to apply',
      });
    }

    if (!jobId || !candidate_id || !fullName || !email || !phone || !resume) {
      console.error(`POST /api/jobs/${jobId}/apply: Missing required fields, jobId=${jobId}, candidate_id=${candidate_id}`);
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'jobId, candidate_id, fullName, email, phone, and resume are required',
      });
    }

    const jobIdNum = parseInt(jobId, 10);
    if (isNaN(jobIdNum)) {
      console.error(`POST /api/jobs/${jobId}/apply: Invalid jobId=${jobId}`);
      return res.status(400).json({
        error: 'Invalid job ID',
        details: 'Job ID must be a valid number',
      });
    }

    // Do not parse candidate_id as integer since it's varchar(50)
    if (!candidate_id) {
      console.error(`POST /api/jobs/${jobId}/apply: Invalid candidate_id=${candidate_id}`);
      return res.status(400).json({
        error: 'Invalid candidate ID',
        details: 'Candidate ID must be provided',
      });
    }

    const [jobExists] = await pool.query('SELECT id, status FROM jobs WHERE id = ? AND deleted_at IS NULL', [jobIdNum]);
    if (!jobExists.length) {
      console.error(`POST /api/jobs/${jobId}/apply: Job not found, jobId=${jobIdNum}`);
      return res.status(404).json({
        error: 'Job not found',
        details: `Job with ID ${jobId} does not exist`,
      });
    }
    if (jobExists[0].status !== 'Active') {
      console.error(`POST /api/jobs/${jobId}/apply: Job inactive, jobId=${jobIdNum}`);
      return res.status(400).json({
        error: 'Job is inactive',
        details: `Job with ID ${jobId} is not accepting applications`,
      });
    }

    const [userExists] = await pool.query('SELECT id FROM users WHERE id = ?', [candidate_id]);
    if (!userExists.length) {
      console.error(`POST /api/jobs/${jobId}/apply: User not found, candidate_id=${candidate_id}`);
      return res.status(400).json({
        error: 'Invalid candidate ID',
        details: `User with ID ${candidate_id} does not exist`,
      });
    }

    const [existingApp] = await pool.query(
      'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
      [jobIdNum, candidate_id]
    );
    if (existingApp.length) {
      console.error(`POST /api/jobs/${jobId}/apply: Duplicate application, jobId=${jobIdNum}, candidate_id=${candidate_id}`);
      return res.status(400).json({
        error: 'Application already exists',
        details: 'You have already applied to this job',
      });
    }

    const columns = [
      'job_id',
      'candidate_id',
      'fullName',
      'email',
      'phone',
      'location',
      'experience',
      'jobTitle',
      'company',
      'qualification',
      'specialization',
      'university',
      'skills',
      'resume',
      'coverLetter',
      'linkedIn',
      'portfolio',
      'status',
      // 'createdAt' is omitted because it defaults to CURRENT_TIMESTAMP
    ];
    const values = [
      jobIdNum,
      candidate_id, // Keep as string to match varchar(50)
      fullName,
      email,
      phone,
      location || null,
      experience || null, // Schema shows varchar(10), so keep as string
      jobTitle || null,
      company || null,
      qualification || null,
      specialization || null,
      university || null,
      skills || null,
      resume,
      coverLetter || null,
      linkedIn || null,
      portfolio || null,
      status || 'applied',
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await pool.query(
      `INSERT INTO applications (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    console.log(`POST /api/jobs/${jobId}/apply: jobId=${jobIdNum}, candidate_id=${candidate_id}, applicationId=${result.insertId}`);
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: result.insertId,
      jobId: jobIdNum,
    });
  } catch (err) {
    console.error(`POST /api/jobs/${jobId || 'unknown'}/apply: Backend error`, err);
    let errorDetails = err.message;
    if (err instanceof MulterError) {
      errorDetails = `File upload error: ${err.message}`;
      return res.status(400).json({ error: 'File upload error', details: errorDetails });
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      errorDetails = 'Invalid job_id or candidate_id. Ensure the job and user exist.';
    } else if (err.code === 'ER_DUP_ENTRY') {
      errorDetails = 'Application already exists for this job.';
    } else if (err.code === 'ER_BAD_FIELD_ERROR') {
      errorDetails = `Database error: ${err.sqlMessage}`;
    }
    res.status(500).json({
      error: 'Error creating application',
      details: errorDetails,
    });
  }
};


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








