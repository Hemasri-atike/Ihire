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
  next();
  // if (!req.user || !['employer', 'admin'].includes(req.user.role)) {
  //   console.error(`requireEmployer: Unauthorized access, user=${JSON.stringify(req.user)}`);
  //   return res.status(403).json({ error: 'Unauthorized', details: 'Only employers or admins can access this resource' });
  // }
};

const getJobs = async (req, res) => {
  try {
    const { statusFilter = "All", searchQuery = "", page = 1, jobsPerPage = 10, postedByUser, userId, category, subcategory_id } = req.query;
    const offset = (page - 1) * jobsPerPage;
    const authUserId = req.user?.id;

    let baseQuery = `
      SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
      FROM jobs j 
      LEFT JOIN subcategories s ON j.subcategory_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE j.deleted_at IS NULL`;
    let countQuery = "SELECT COUNT(*) as total FROM jobs WHERE deleted_at IS NULL";
    const params = [];

    if (req.user?.role === "employer" || postedByUser === "true" || userId) {
      const filterUserId = userId || authUserId;
      if (filterUserId) {
        baseQuery += " AND j.user_id = ?";
        countQuery += " AND user_id = ?";
        params.push(filterUserId);
      }
    }

    if (statusFilter && statusFilter.toLowerCase() !== "all") {
      baseQuery += " AND j.status = ?";
      countQuery += " AND status = ?";
      params.push(statusFilter);
    }

    if (category) {
      baseQuery += " AND j.category = ?";
      countQuery += " AND category = ?";
      params.push(category);
    }

    if (subcategory_id) {
      baseQuery += " AND j.subcategory_id = ?";
      countQuery += " AND subcategory_id = ?";
      params.push(parseInt(subcategory_id));
    }

    if (searchQuery) {
      baseQuery += " AND (j.title LIKE ? OR j.company_name LIKE ? OR s.name LIKE ?)";
      countQuery += " AND (title LIKE ? OR company_name LIKE ?)";
      params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }

    const [totalResult] = await pool.query(countQuery, params.slice(0, params.length - 1));
    const total = totalResult[0].total;

    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    const [jobs] = await pool.query(paginatedQuery, [...params, parseInt(jobsPerPage), parseInt(offset)]);

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || "[]");
        } catch {
          return typeof job.tags === "string" ? job.tags.split(",").map((tag) => tag.trim()) : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}');
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      created_at: job.created_at,
      applicantCount: job.applicantCount || 0,
      views: job.views || 0,
      subcategory: job.subcategory_name || null,
      category: job.category_name || job.category || null,
    }));

    console.log(`GET /api/jobs: userId=${authUserId}, total=${total}, page=${page}, limit=${jobsPerPage}, params=${JSON.stringify(req.query)}`);
    res.json({
      jobs: jobsWithParsedJSON,
      total,
      page: parseInt(page),
      limit: parseInt(jobsPerPage),
    });
  } catch (err) {
    console.error("getJobs Error:", err);
    res.status(500).json({ error: "Error fetching jobs", details: err.message });
  }
};

const getPostedJobs = async (req, res) => {
  const userId = req.user?.id;

  try {
    console.log(`getPostedJobs: userId=${userId}`);
    const [jobs] = await pool.query(
      `SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
       FROM jobs j 
       LEFT JOIN subcategories s ON j.subcategory_id = s.id
       LEFT JOIN categories c ON s.category_id = c.id
       WHERE j.user_id = ? AND j.deleted_at IS NULL`,
      [userId]
    );

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || "[]");
        } catch {
          return typeof job.tags === "string" ? job.tags.split(",").map((tag) => tag.trim()) : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}');
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      created_at: job.created_at,
      applicantCount: job.applicantCount || 0,
      views: job.views || 0,
      subcategory: job.subcategory_name || null,
      category: job.category_name || job.category || null,
    }));

    console.log(`GET /api/jobs/posted: userId=${userId}, found ${jobs.length} jobs`);
    res.json(jobsWithParsedJSON);
  } catch (err) {
    console.error(`getPostedJobs Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: "Error fetching posted jobs", details: err.message });
  }
};

const getJobById = async (req, res) => {
  console.log("call")
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

export const createJob = async (req, res) => {
  const {
    title,
    company_name,
    description,
    category,
    type,
    tags = [],
    salary,
    location,
    experience,
    startDate,
    deadline,
    contactPerson,
    role,
    vacancies,
  } = req.body;

  const userId = req.user?.id;
  const requestId = req.headers["x-request-id"] || Date.now();

  try {
    console.log(
      `createJob: requestId=${requestId}, userId=${userId}, jobData=`,
      req.body
    );
    if (!title || !company_name || !description || !category) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Title, company_name, description, and category are required",
      });
    }

    const [existingJob] = await pool.query(
      "SELECT id FROM jobs WHERE user_id = ? AND title = ? AND company_name = ? AND deleted_at IS NULL",
      [userId, title, company_name]
    );

    if (existingJob.length > 0) {
      console.error(
        `POST /api/jobs: Duplicate job detected, requestId=${requestId}, userId=${userId}, title=${title}, company_name=${company_name}`
      );
      return res.status(400).json({
        error: "Duplicate job",
        details: "A job with the same title and company already exists",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs 
       (user_id, title, company_name, description, category, type, tags, salary, location, experience, startDate, deadline, contactPerson, role, vacancies, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        title,
        company_name,
        description,
        category,
        type,
        JSON.stringify(tags),
        salary,
        location,
        experience,
        startDate,
        deadline,
        contactPerson,
        role,
        vacancies,
      ]
    );

    console.log(
      `POST /api/jobs: Created jobId=${result.insertId}, requestId=${requestId}, userId=${userId}`
    );
    res
      .status(201)
      .json({ jobId: result.insertId, message: "Job created successfully" });
  } catch (err) {
    console.error(
      `createJob Error: requestId=${requestId}, userId=${userId}, error=`,
      err
    );
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Duplicate job",
        details: "A job with the same title and company already exists",
      });
    }
    res.status(500).json({ error: "Error creating job", details: err.message });
  }
};

export const updateJob = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    if (conn.connection._closing) {
      throw new Error("Connection is in a closed state");
    }

    const { id } = req.params;
    const {
      title,
      company_name,
      location,
      description,
      category,
      salary,
      type,
      experience,
      deadline,
      tags,
      status,
      contactPerson,
      role,
      startDate,
      vacancies,
    } = req.body;

    if (!title || !company_name || !location || !description) {
      throw new Error(
        "Missing required fields: title, company_name, location, description"
      );
    }

    const [[job]] = await conn.execute(
      "SELECT * FROM jobs WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!job) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    const query = `
      UPDATE jobs 
      SET title = ?, company_name = ?, location = ?, description = ?, 
          category = ?, salary = ?, type = ?, experience = ?, 
          deadline = ?, tags = ?, status = ?, contactPerson = ?, 
          role = ?, startDate = ?, vacancies = ?
      WHERE id = ? AND user_id = ?
    `;
    const values = [
      title.substring(0, 255),
      company_name.substring(0, 255),
      location.substring(0, 100),
      description.substring(0, 5000),
      category?.substring(0, 100) ?? null,
      salary ? parseFloat(salary) : null,
      type?.substring(0, 50) ?? null,
      experience?.substring(0, 100) ?? null,
      deadline ? new Date(deadline).toISOString().split("T")[0] : null,
      tags ? JSON.stringify(tags) : null,
      status?.substring(0, 50) ?? "Draft",
      contactPerson?.substring(0, 100) ?? null,
      role?.substring(0, 100) ?? null,
      startDate ? new Date(startDate).toISOString().split("T")[0] : null,
      vacancies ? parseInt(vacancies) : null,
      id,
      req.user.id,
    ];

    await conn.execute(query, values);
    res.json({ id, ...req.body, message: "Job updated successfully" });
  } catch (error) {
    console.error("Error in updateJob:", {
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
      requestData: JSON.stringify(req.body, null, 2),
    });
    res
      .status(500)
      .json({ error: "Failed to update job", details: error.message });
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", {
          message: releaseError.message,
          stack: releaseError.stack,
        });
      }
    }
  }
};

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


const getApplicantsByJob = async (req, res) => {
  const jobId = req.params.jobId;
  const user_id = req.user?.id;  // get from token
  if (!user_id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [rows] = await pool.query(
      `SELECT id, job_id, candidate_id, fullName AS name, email, phone, location, experience,
       jobTitle AS position, company, qualification, specialization, university,
       skills, resume AS resume_url, coverLetter AS cover_letter_url, linkedIn, portfolio,
       status, createdAt AS applied_at
       FROM applications
       WHERE job_id = ?`,
      [jobId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getApplicantsByJob Error:", err);
    res.status(500).json({ error: "Error fetching applicants", details: err.message });
  }
};






//  const getApplicantsByJob = async (req, res) => {
//   const jobId = req.params.id; 
//   const user_id = req.query.user_id;  
// console.log("sdf",user_id)
//   if (!user_id) {
//     return res.status(400).json({ error: "user_id is required" });
//   }

//   try {
//     const [rows] = await pool.query(
//       `SELECT id, job_id, candidate_id, fullName AS name, email, phone, location, experience,
//        jobTitle AS position, company, qualification, specialization, university,
//        skills, resume AS resume_url, coverLetter AS cover_letter_url, linkedIn, portfolio,
//        status, createdAt AS applied_at
//        FROM applications
//        WHERE user_id = ?`,
//       [user_id]
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error("getApplicantsByJob Error:", err);
//     res.status(500).json({ error: "Error fetching applicants", details: err.message });
//   }
// };


// Apply to a job
 const applyToJob = async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  const candidate_id = req.user?.id;

  if (!req.user || req.user.role !== 'job_seeker') {
    return res.status(401).json({ error: 'Authentication required', details: 'You must be logged in as a job seeker' });
  }
  if (!jobId || !candidate_id) {
    return res.status(400).json({ error: 'Missing required fields', details: 'Job ID and candidate ID are required' });
  }

  try {
    const [jobExists] = await pool.query('SELECT id, status, title FROM jobs WHERE id = ? AND deleted_at IS NULL', [jobId]);
    if (!jobExists.length) return res.status(404).json({ error: 'Job not found' });
    if (jobExists[0].status !== 'Active') return res.status(400).json({ error: 'Job is inactive' });

    const [existingApp] = await pool.query(
      'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
      [jobId, candidate_id]
    );
    if (existingApp.length) return res.status(400).json({ error: 'Application already exists' });

    const resume = req.files?.resume ? path.join('uploads', req.files.resume[0].filename) : null;
    const coverLetter = req.files?.coverLetter ? path.join('uploads', req.files.coverLetter[0].filename) : null;

    const columns = [
      'job_id', 'candidate_id', 'fullName', 'email', 'phone', 'location', 'experience',
      'jobTitle', 'company', 'qualification', 'specialization', 'university', 'skills',
      'resume', 'coverLetter', 'linkedIn', 'portfolio', 'status'
    ];
    const values = [
      jobId, candidate_id, req.body.fullName, req.body.email, req.body.phone,
      req.body.location || null, req.body.experience || null, req.body.jobTitle || jobExists[0].title,
      req.body.company || null, req.body.qualification || null, req.body.specialization || null,
      req.body.university || null, req.body.skills ? JSON.stringify(req.body.skills) : null,
      resume, coverLetter, req.body.linkedIn || null, req.body.portfolio || null, req.body.status || 'Applied'
    ];

    const placeholders = columns.map(() => '?').join(',');
    const [result] = await pool.query(`INSERT INTO applications (${columns.join(',')}) VALUES (${placeholders})`, values);

    await pool.query('UPDATE jobs SET applicantCount = applicantCount + 1 WHERE id = ?', [jobId]);

    res.status(201).json({ message: 'Application submitted successfully', applicationId: result.insertId });
  } catch (err) {
    console.error(`applyToJob Error: jobId=${jobId}, candidate_id=${candidate_id}`, err);
    res.status(500).json({ error: 'Error applying to job', details: err.message });
  }
};


export const getApplicantsForEmployer = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id" });
    }

    // Check if this user is an employer
    const [employer] = await pool.query("SELECT id, role FROM users WHERE id = ?", [user_id]);
    if (!employer.length || employer[0].role !== "employer") {
      return res.status(403).json({ error: "Unauthorized: Not an employer" });
    }

    // Get all jobs posted by this employer
    const [jobs] = await pool.query("SELECT id, title FROM jobs WHERE user_id = ?", [user_id]);
    if (!jobs.length) {
      return res.json([]);
    }

    const jobIds = jobs.map(j => j.id);

    // Get applicants for those jobs
    const [applicants] = await pool.query(
      `SELECT a.*, u.name AS full_name, u.email, u.mobile 
       FROM applications a 
       JOIN users u ON a.user_id = u.id
       WHERE a.job_id IN (?)`,
      [jobIds]
    );

    res.json(applicants);
  } catch (err) {
    console.error("getApplicantsForEmployer Error:", err.message);
    res.status(500).json({ error: "Error fetching applicants", details: err.message });
  }
};



export default {
  getJobs,
  getPostedJobs: [requireEmployer, getPostedJobs],
  getJobById: [requireEmployer, getJobById],
  getApplicantsByJob,
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








