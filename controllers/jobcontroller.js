import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { MulterError } from 'multer';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(UploadsDir, { recursive: true });
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
    const { statusFilter = "All", searchQuery = "", page = 1, jobsPerPage = 10, postedByUser, userId, category_id, subcategory_id } = req.query;
    const offset = (page - 1) * jobsPerPage;
    const authUserId = req.user?.id;

    let baseQuery = `
      SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
      FROM jobs j 
      LEFT JOIN subcategories s ON j.subcategory_id = s.id
      LEFT JOIN categories c ON j.category_id = c.id
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

    if (category_id) {
      baseQuery += " AND j.category_id = ?";
      countQuery += " AND category_id = ?";
      params.push(parseInt(category_id));
    }

    if (subcategory_id) {
      baseQuery += " AND j.subcategory_id = ?";
      countQuery += " AND subcategory_id = ?";
      params.push(parseInt(subcategory_id));
    }

    if (searchQuery) {
      baseQuery += " AND (j.title LIKE ? OR j.company_name LIKE ? OR s.name LIKE ? OR j.skills LIKE ?)";
      countQuery += " AND (title LIKE ? OR company_name LIKE ? OR skills LIKE ?)";
      params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }

    const [totalResult] = await pool.query(countQuery, params.slice(0, searchQuery ? params.length - 1 : params.length));
    const total = totalResult[0].total;

    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    const [jobs] = await pool.query(paginatedQuery, [...params, parseInt(jobsPerPage), parseInt(offset)]);

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      skills: (() => {
        try {
          return JSON.parse(job.skills || "[]");
        } catch {
          return typeof job.skills === "string" ? job.skills.split(",").map((skill) => skill.trim()) : [];
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
      category: job.category_name || null,
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
       LEFT JOIN categories c ON j.category_id = c.id
       WHERE j.user_id = ? AND j.deleted_at IS NULL`,
      [userId]
    );

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      skills: (() => {
        try {
          return JSON.parse(job.skills || "[]");
        } catch {
          return typeof job.skills === "string" ? job.skills.split(",").map((skill) => skill.trim()) : [];
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
      category: job.category_name || null,
    }));

    console.log(`GET /api/jobs/posted: userId=${userId}, found ${jobs.length} jobs`);
    res.json(jobsWithParsedJSON);
  } catch (err) {
    console.error(`getPostedJobs Error: userId=${userId}, error=`, err);
    res.status(500).json({ error: "Error fetching posted jobs", details: err.message });
  }
};

const getJobById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    console.log(`getJobById: userId=${userId}, jobId=${id}`);
    const [jobs] = await pool.query(
      `SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
       FROM jobs j 
       LEFT JOIN subcategories s ON j.subcategory_id = s.id
       LEFT JOIN categories c ON j.category_id = c.id
       WHERE j.id = ? AND j.user_id = ? AND j.deleted_at IS NULL`,
      [id, userId]
    );
    if (!jobs.length) {
      console.log(`GET /api/jobs/${id}: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const job = jobs[0];
    const jobWithParsedJSON = {
      ...job,
      skills: (() => {
        try {
          return JSON.parse(job.skills || '[]');
        } catch {
          return typeof job.skills === 'string' ? job.skills.split(',').map((skill) => skill.trim()) : [];
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
      subcategory: job.subcategory_name || null,
      category: job.category_name || null,
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
    const { category_id } = req.query;
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required', details: 'category_id query parameter is missing' });
    }

    const [jobs] = await pool.query(
      `SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
       FROM jobs j 
       LEFT JOIN subcategories s ON j.subcategory_id = s.id
       LEFT JOIN categories c ON j.category_id = c.id
       WHERE j.category_id = ? AND j.deleted_at IS NULL`,
      [parseInt(category_id)]
    );
    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      skills: (() => {
        try {
          return JSON.parse(job.skills || '[]');
        } catch {
          return typeof job.skills === 'string' ? job.skills.split(',').map((skill) => skill.trim()) : [];
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
      subcategory: job.subcategory_name || null,
      category: job.category_name || null,
    }));

    console.log(`GET /api/jobs/by-category: category_id=${category_id}, found ${jobs.length} jobs`);
    res.json({ jobs: jobsWithParsedJSON, total: jobs.length });
  } catch (err) {
    console.error('getJobsByCategory Error:', err);
    res.status(500).json({ error: 'Error fetching jobs by category', details: err.message });
  }
};

export const getSkills = async (req, res) => {
  try {
    console.log('GET /api/jobs/skills called'); // Debug log
    const [skills] = await pool.query('SELECT skill FROM job_skills ORDER BY skill');
    if (!skills || skills.length === 0) {
      console.log('No skills found in database'); // Debug log
      return res.status(200).json([]);
    }
    res.json(skills.map(s => s.skill));
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills', details: error.message });
  }
};

export const addSkill = async (req, res) => {
  const { skill } = req.body;
  if (!skill || typeof skill !== 'string' || skill.trim() === '') {
    return res.status(400).json({ error: 'Invalid skill', details: 'Skill must be a non-empty string' });
  }
  try {
    await pool.query('INSERT INTO job_skills (skill) VALUES (?)', [skill.trim()]);
    res.status(201).json({ message: 'Skill added successfully', skill: skill.trim() });
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).json({ error: 'Failed to add skill', details: error.message });
  }
};

export const createJob = async (req, res) => {
  const {
    title,
    company_name,
    location,
    description,
    category_id,
    subcategory_id,
    salary,
    type,
    experience,
    deadline,
    skills,
    status,
    contactPerson,
    role,
    startDate,
    vacancies,
    userId,
  } = req.body;

  const defaultUserId = 1; // Replace with a valid system user ID
  const jobUserId = userId || req.user?.id || defaultUserId;

  if (!title || !company_name || !location || !description || !category_id || !type || !deadline) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  try {
    // Verify category_id
    const [categoryResult] = await pool.query('SELECT id, name FROM categories WHERE id = ?', [parseInt(category_id)]);
    if (!categoryResult.length) {
      return res.status(400).json({ error: 'Invalid category_id' });
    }

    let subcategoryName = null;
    if (subcategory_id) {
      const [subcategoryResult] = await pool.query('SELECT id, name FROM subcategories WHERE id = ? AND category_id = ?', [
        parseInt(subcategory_id),
        parseInt(category_id),
      ]);
      if (!subcategoryResult.length) {
        return res.status(400).json({ error: 'Invalid subcategory_id or subcategory does not belong to the selected category' });
      }
      subcategoryName = subcategoryResult[0].name;
    }

    // Validate skills against job_skills table
    if (skills && Array.isArray(skills)) {
      const [validSkills] = await pool.query('SELECT skill FROM job_skills WHERE skill IN (?)', [skills]);
      const validSkillNames = validSkills.map(s => s.skill);
      const invalidSkills = skills.filter(s => !validSkillNames.includes(s));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ error: 'Invalid skills', details: `Skills not found in database: ${invalidSkills.join(', ')}` });
      }
    }

    // Verify userId exists
    if (jobUserId) {
      const [userResult] = await pool.query('SELECT id FROM users WHERE id = ?', [jobUserId]);
      if (!userResult.length) {
        return res.status(400).json({ error: 'Invalid userId: User does not exist' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO jobs (
        title, company_name, location, description, category_id, subcategory_id, salary, type, experience, deadline, skills, status, contactPerson, role, startDate, vacancies, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.substring(0, 255),
        company_name.substring(0, 255),
        location.substring(0, 100),
        description.substring(0, 5000),
        parseInt(category_id),
        subcategory_id ? parseInt(subcategory_id) : null,
        salary ? parseFloat(salary) : 0,
        type?.substring(0, 50) ?? null,
        experience?.substring(0, 100) ?? null,
        deadline ? new Date(deadline).toISOString().split("T")[0] : null,
        JSON.stringify(skills || []),
        status?.substring(0, 50) ?? 'Draft',
        contactPerson?.substring(0, 100) ?? null,
        role?.substring(0, 100) ?? null,
        startDate ? new Date(startDate).toISOString().split("T")[0] : null,
        vacancies ? parseInt(vacancies) : 1,
        jobUserId,
      ]
    );

    const newJob = {
      id: result.insertId,
      title,
      company_name,
      location,
      description,
      category_id: parseInt(category_id),
      subcategory_id: subcategory_id ? parseInt(subcategory_id) : null,
      category: categoryResult[0].name,
      subcategory: subcategoryName,
      salary: salary ? parseFloat(salary) : 0,
      type,
      experience,
      deadline,
      skills: skills || [],
      status: status || 'Draft',
      contactPerson,
      role,
      startDate,
      vacancies: vacancies || 1,
      user_id: jobUserId,
      created_at: new Date(),
      views: 0,
      applicantCount: 0,
    };

    console.log(`POST /api/jobs: Created job id=${result.insertId} with user_id=${jobUserId}`);
    res.status(201).json(newJob);
  } catch (error) {
    console.error('createJob Error:', { userId: jobUserId, error: error.message });
    res.status(500).json({ error: 'Failed to create job', details: error.message });
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
      category_id,
      subcategory_id,
      salary,
      type,
      experience,
      deadline,
      skills,
      status,
      contactPerson,
      role,
      startDate,
      vacancies,
    } = req.body;

    if (!title || !company_name || !location || !description || !category_id || !type || !deadline) {
      return res.status(400).json({ error: "Missing required fields", details: "title, company_name, location, description, category_id, type, deadline are required" });
    }

    const [[job]] = await conn.execute(
      "SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
      [id, req.user?.id || 1] 
    );
    if (!job) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    const [categoryResult] = await conn.query('SELECT id, name FROM categories WHERE id = ?', [parseInt(category_id)]);
    if (!categoryResult.length) {
      return res.status(400).json({ error: 'Invalid category_id' });
    }

    let subcategoryName = null;
    if (subcategory_id) {
      const [subcategoryResult] = await conn.query('SELECT id, name FROM subcategories WHERE id = ? AND category_id = ?', [
        parseInt(subcategory_id),
        parseInt(category_id),
      ]);
      if (!subcategoryResult.length) {
        return res.status(400).json({ error: 'Invalid subcategory_id or subcategory does not belong to the selected category' });
      }
      subcategoryName = subcategoryResult[0].name;
    }

    if (skills && Array.isArray(skills)) {
      const [validSkills] = await conn.query('SELECT skill FROM job_skills WHERE skill IN (?)', [skills]);
      const validSkillNames = validSkills.map(s => s.skill);
      const invalidSkills = skills.filter(s => !validSkillNames.includes(s));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ error: 'Invalid skills', details: `Skills not found in database: ${invalidSkills.join(', ')}` });
      }
    }

    const query = `
      UPDATE jobs 
      SET title = ?, company_name = ?, location = ?, description = ?, 
          category_id = ?, subcategory_id = ?, salary = ?, type = ?, experience = ?, 
          deadline = ?, skills = ?, status = ?, contactPerson = ?, 
          role = ?, startDate = ?, vacancies = ?
      WHERE id = ? AND user_id = ?
    `;
    const values = [
      title.substring(0, 255),
      company_name.substring(0, 255),
      location.substring(0, 100),
      description.substring(0, 5000),
      parseInt(category_id),
      subcategory_id ? parseInt(subcategory_id) : null,
      salary ? parseFloat(salary) : 0,
      type?.substring(0, 50) ?? null,
      experience?.substring(0, 100) ?? null,
      deadline ? new Date(deadline).toISOString().split("T")[0] : null,
      skills ? JSON.stringify(skills) : JSON.stringify([]),
      status?.substring(0, 50) ?? "Draft",
      contactPerson?.substring(0, 100) ?? null,
      role?.substring(0, 100) ?? null,
      startDate ? new Date(startDate).toISOString().split("T")[0] : null,
      vacancies ? parseInt(vacancies) : 1,
      id,
      req.user?.id || 1, // Fallback to default user ID
    ];

    await conn.execute(query, values);

    const updatedJob = {
      id,
      title,
      company_name,
      location,
      description,
      category_id: parseInt(category_id),
      subcategory_id: subcategory_id ? parseInt(subcategory_id) : null,
      category: categoryResult[0].name,
      subcategory: subcategoryName,
      salary: salary ? parseFloat(salary) : 0,
      type,
      experience,
      deadline,
      skills: skills || [],
      status,
      contactPerson,
      role,
      startDate,
      vacancies: vacancies || 1,
      user_id: req.user?.id || 1,
      created_at: job.created_at,
      views: job.views || 0,
      applicantCount: job.applicantCount || 0,
    };

    console.log(`PUT /api/jobs/${id}: userId=${req.user?.id || 1}, updated jobId=${id}`);
    res.json(updatedJob);
  } catch (error) {
    console.error("Error in updateJob:", {
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
      requestData: JSON.stringify(req.body, null, 2),
    });
    res.status(500).json({ error: "Failed to update job", details: error.message });
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
  const userId = req.user?.id || 1;

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
  const userId = req.user?.id || 1;

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

const toggleJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.id || 1;

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
      SELECT a.*, j.title, j.company_name, j.location, j.salary, j.skills
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
      query += ' AND (j.title LIKE ? OR j.company_name LIKE ? OR j.skills LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ? AND j.deleted_at IS NULL
      ${status && status !== 'All' ? ' AND a.status = ?' : ''}
      ${search ? ' AND (j.title LIKE ? OR j.company_name LIKE ? OR j.skills LIKE ?)' : ''}
    `;
    const countParams = status && status !== 'All' ? [candidate_id, status, ...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [])] : [candidate_id, ...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [])];

    query += ' ORDER BY a.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [applications] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    const applicationsWithParsedJSON = applications.map((app) => ({
      ...app,
      skills: (() => {
        try {
          return JSON.parse(app.skills || '[]');
        } catch {
          return typeof app.skills === 'string' ? app.skills.split(',').map((skill) => skill.trim()) : [];
        }
      })(),
    }));

    console.log(`GET /api/jobs/user-applications: candidate_id=${candidate_id}, page=${page}, limit=${limit}, total=${total}`);
    res.status(200).json({
      jobs: applicationsWithParsedJSON,
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

const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT id, name FROM categories');
    console.log(`GET /api/jobs/categories: userId=${req.user?.id}, found ${categories.length} categories`);
    res.json(categories);
  } catch (err) {
    console.error('getCategories Error:', { userId: req.user?.id, error: err.message });
    res.status(500).json({ error: 'Error fetching categories', details: err.message });
  }
};

const getApplicantsByJob = async (req, res) => {
  const jobId = req.params.jobId;
  const userId = req.user?.id || 1;

  try {
    console.log(`getApplicantsByJob: userId=${userId}, jobId=${jobId}`);
    const [job] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [jobId, userId]
    );
    if (!job.length) {
      console.log(`GET /api/jobs/${jobId}/applicants: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const [rows] = await pool.query(
      `SELECT id, job_id, candidate_id, fullName AS name, email, phone, location, experience,
       jobTitle AS position, company, qualification, specialization, university,
       skills, resume AS resume_url, coverLetter AS cover_letter_url, linkedIn, portfolio,
       status, createdAt AS applied_at
       FROM applications
       WHERE job_id = ?`,
      [jobId]
    );

    const applicantsWithParsedJSON = rows.map((app) => ({
      ...app,
      skills: (() => {
        try {
          return JSON.parse(app.skills || '[]');
        } catch {
          return typeof app.skills === 'string' ? app.skills.split(',').map((skill) => skill.trim()) : [];
        }
      })(),
    }));

    console.log(`GET /api/jobs/${jobId}/applicants: userId=${userId}, found ${rows.length} applicants`);
    res.json(applicantsWithParsedJSON);
  } catch (err) {
    console.error("getApplicantsByJob Error:", err);
    res.status(500).json({ error: "Error fetching applicants", details: err.message });
  }
};

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

    const resume = req.files?.resume ? path.join('Uploads', req.files.resume[0].filename) : null;
    const coverLetter = req.files?.coverLetter ? path.join('Uploads', req.files.coverLetter[0].filename) : null;

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

    console.log(`POST /api/jobs/${jobId}/apply: candidate_id=${candidate_id}, applicationId=${result.insertId}`);
    res.status(201).json({ message: 'Application submitted successfully', applicationId: result.insertId });
  } catch (err) {
    console.error(`applyToJob Error: jobId=${jobId}, candidate_id=${candidate_id}`, err);
    res.status(500).json({ error: 'Error applying to job', details: err.message });
  }
};

export const getApplicantsForEmployer = async (req, res) => {
  try {
    const { user_id } = req.query;
    const authUserId = req.user?.id || 1;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id" });
    }

    // Check if this user is an employer (optional since requireEmployer is commented out)
    const [employer] = await pool.query("SELECT id, role FROM users WHERE id = ?", [user_id]);
    if (!employer.length || employer[0].role !== "employer") {
      return res.status(403).json({ error: "Unauthorized: Not an employer" });
    }

    // Get all jobs posted by this employer
    const [jobs] = await pool.query("SELECT id, title FROM jobs WHERE user_id = ? AND deleted_at IS NULL", [user_id]);
    if (!jobs.length) {
      return res.json([]);
    }

    const jobIds = jobs.map(j => j.id);

    // Get applicants for those jobs
    const [applicants] = await pool.query(
      `SELECT a.*, u.name AS full_name, u.email, u.mobile 
       FROM applications a 
       JOIN users u ON a.candidate_id = u.id
       WHERE a.job_id IN (?)`,
      [jobIds]
    );

    const applicantsWithParsedJSON = applicants.map((app) => ({
      ...app,
      skills: (() => {
        try {
          return JSON.parse(app.skills || '[]');
        } catch {
          return typeof app.skills === 'string' ? app.skills.split(',').map((skill) => skill.trim()) : [];
        }
      })(),
    }));

    console.log(`GET /api/jobs/applicants-for-employer: userId=${user_id}, found ${applicants.length} applicants`);
    res.json(applicantsWithParsedJSON);
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
  getSkills,
  addSkill,
  getApplicantsForEmployer,
};