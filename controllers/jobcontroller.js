import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { MulterError } from 'multer';

// Ensure uploads directory exists with error handling
const uploadsDir = path.join(process.cwd(), 'Uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(UploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('Error creating uploads directory:', err.message);
}

// Input validation helper
const validateRequiredFields = (fields, data, res) => {
  const missing = fields.filter(field => !data[field] || data[field].toString().trim() === '');
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', details: `Required fields: ${missing.join(', ')}` });
  }
  return null;
};

const getJobs = async (req, res) => {
  try {
    const { statusFilter = 'All', searchQuery = '', page = 1, jobsPerPage = 10, postedByUser, userId, category_id, subcategory_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(jobsPerPage);

    let baseQuery = `
      SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
      FROM jobs j 
      LEFT JOIN subcategories s ON j.subcategory_id = s.id
      LEFT JOIN categories c ON j.category_id = c.id
      WHERE j.deleted_at IS NULL`;
    let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE deleted_at IS NULL';
    const params = [];

    if (postedByUser === 'true' && userId) {
      baseQuery += ' AND j.user_id = ?';
      countQuery += ' AND user_id = ?';
      params.push(parseInt(userId));
    }

    if (statusFilter && statusFilter.toLowerCase() !== 'all') {
      baseQuery += ' AND j.status = ?';
      countQuery += ' AND status = ?';
      params.push(statusFilter);
    }

    if (category_id) {
      baseQuery += ' AND j.category_id = ?';
      countQuery += ' AND category_id = ?';
      params.push(parseInt(category_id));
    }

    if (subcategory_id) {
      baseQuery += ' AND j.subcategory_id = ?';
      countQuery += ' AND subcategory_id = ?';
      params.push(parseInt(subcategory_id));
    }

    if (searchQuery) {
      baseQuery += ' AND (j.title LIKE ? OR j.company_name LIKE ? OR s.name LIKE ? OR j.skills LIKE ?)';
      countQuery += ' AND (title LIKE ? OR company_name LIKE ? OR skills LIKE ?)';
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
          return JSON.parse(job.skills || '[]');
        } catch {
          return typeof job.skills === 'string' ? job.skills.split(',').map(skill => skill.trim()) : [];
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

    console.log(`GET /api/jobs: userId=${userId || 'none'}, total=${total}, page=${page}, limit=${jobsPerPage}, params=${JSON.stringify(req.query)}`);
    res.json({
      jobs: jobsWithParsedJSON,
      total,
      page: parseInt(page),
      limit: parseInt(jobsPerPage),
    });
  } catch (err) {
    console.error('getJobs Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching jobs', details: err.message });
  }
};

const getPostedJobs = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
    const [jobs] = await pool.query(
      `SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
       FROM jobs j 
       LEFT JOIN subcategories s ON j.subcategory_id = s.id
       LEFT JOIN categories c ON j.category_id = c.id
       WHERE j.user_id = ? AND j.deleted_at IS NULL`,
      [parseInt(userId)]
    );

    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      skills: (() => {
        try {
          return JSON.parse(job.skills || '[]');
        } catch {
          return typeof job.skills === 'string' ? job.skills.split(',').map(skill => skill.trim()) : [];
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
    console.error(`getPostedJobs Error: userId=${userId}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching posted jobs', details: err.message });
  }
};

const getJobById = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
    const [jobs] = await pool.query(
      `SELECT j.*, s.name AS subcategory_name, c.name AS category_name 
       FROM jobs j 
       LEFT JOIN subcategories s ON j.subcategory_id = s.id
       LEFT JOIN categories c ON j.category_id = c.id
       WHERE j.id = ? AND j.user_id = ? AND j.deleted_at IS NULL`,
      [id, parseInt(userId)]
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
          return typeof job.skills === 'string' ? job.skills.split(',').map(skill => skill.trim()) : [];
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
    };

    console.log(`GET /api/jobs/${id}: userId=${userId}, jobId=${id}`);
    res.json(jobWithParsedJSON);
  } catch (err) {
    console.error(`getJobById Error: id=${id}, userId=${userId}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching job', details: err.message });
  }
};

const getApplications = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
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
      [parseInt(userId)]
    );

    console.log(`GET /api/applications: userId=${userId}, found ${applications.length} applications`);
    res.json(applications);
  } catch (err) {
    console.error(`getApplications Error: userId=${userId}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching applications', details: err.message });
  }
};

const getInterviews = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
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
      [parseInt(userId)]
    );

    console.log(`GET /api/interviews: userId=${userId}, found ${interviews.length} interviews`);
    res.json(interviews);
  } catch (err) {
    console.error(`getInterviews Error: userId=${userId}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching interviews', details: err.message });
  }
};

const getAnalytics = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
    const [analytics] = await pool.query(
      `SELECT COALESCE(SUM(j.views), 0) AS views, COALESCE(COUNT(DISTINCT a.id), 0) AS applicantCount
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.user_id = ? AND j.deleted_at IS NULL`,
      [parseInt(userId)]
    );

    console.log(`GET /api/analytics: userId=${userId}, analytics=`, analytics[0]);
    res.json({
      views: analytics[0].views || 0,
      applicantCount: analytics[0].applicantCount || 0,
    });
  } catch (err) {
    console.error(`getAnalytics Error: userId=${userId}`, { message: err.message, stack: err.stack });
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
          return typeof job.skills === 'string' ? job.skills.split(',').map(skill => skill.trim()) : [];
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

    console.log(`GET /api/jobs/by-category: category_id=${category_id}, found ${jobs.length} jobs`);
    res.json({ jobs: jobsWithParsedJSON, total: jobs.length });
  } catch (err) {
    console.error('getJobsByCategory Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching jobs by category', details: err.message });
  }
};

export const getSkills = async (req, res) => {
  try {
    const [skills] = await pool.query('SELECT skill FROM job_skills ORDER BY skill');
    console.log(`GET /api/jobs/skills: found ${skills.length} skills`);
    res.json(skills.map(s => s.skill));
  } catch (err) {
    console.error('getSkills Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch skills', details: err.message });
  }
};

export const addSkill = async (req, res) => {
  const { skill } = req.body;
  if (!skill || typeof skill !== 'string' || skill.trim() === '') {
    return res.status(400).json({ error: 'Invalid skill', details: 'Skill must be a non-empty string' });
  }

  try {
    await pool.query('INSERT INTO job_skills (skill) VALUES (?)', [skill.trim()]);
    console.log(`POST /api/jobs/skills: added skill=${skill.trim()}`);
    res.status(201).json({ message: 'Skill added successfully', skill: skill.trim() });
  } catch (err) {
    console.error('addSkill Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to add skill', details: err.message });
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
    user_id,
  } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required', details: 'user_id is required in request body' });
  }

  const requiredFields = ['title', 'company_name', 'location', 'description', 'category_id', 'type', 'deadline', 'user_id'];
  const validationError = validateRequiredFields(requiredFields, req.body, res);
  if (validationError) return validationError;

  let conn;
  try {
    conn = await pool.getConnection();

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

    const [userResult] = await conn.query('SELECT id FROM users WHERE id = ?', [parseInt(user_id)]);
    if (!userResult.length) {
      return res.status(400).json({ error: 'Invalid user_id: User does not exist' });
    }

    const [result] = await conn.query(
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
        deadline ? new Date(deadline).toISOString().split('T')[0] : null,
        JSON.stringify(skills || []),
        status?.substring(0, 50) ?? 'Draft',
        contactPerson?.substring(0, 100) ?? null,
        role?.substring(0, 100) ?? null,
        startDate ? new Date(startDate).toISOString().split('T')[0] : null,
        vacancies ? parseInt(vacancies) : 1,
        parseInt(user_id),
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
      user_id: parseInt(user_id),
      created_at: new Date(),
      views: 0,
      applicantCount: 0,
    };

    console.log(`POST /api/jobs: Created job id=${result.insertId} with user_id=${user_id}`);
    res.status(201).json(newJob);
  } catch (err) {
    console.error('createJob Error:', { user_id, message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create job', details: err.message });
  } finally {
    if (conn) conn.release();
  }
};

export const updateJob = async (req, res) => {
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
    user_id,
  } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required', details: 'user_id is required in request body' });
  }

  const requiredFields = ['title', 'company_name', 'location', 'description', 'category_id', 'type', 'deadline', 'user_id'];
  const validationError = validateRequiredFields(requiredFields, req.body, res);
  if (validationError) return validationError;

  let conn;
  try {
    conn = await pool.getConnection();

    const [[job]] = await conn.query(
      'SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, parseInt(user_id)]
    );
    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized' });
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
      deadline ? new Date(deadline).toISOString().split('T')[0] : null,
      skills ? JSON.stringify(skills) : JSON.stringify([]),
      status?.substring(0, 50) ?? 'Draft',
      contactPerson?.substring(0, 100) ?? null,
      role?.substring(0, 100) ?? null,
      startDate ? new Date(startDate).toISOString().split('T')[0] : null,
      vacancies ? parseInt(vacancies) : 1,
      id,
      parseInt(user_id),
    ];

    await conn.query(query, values);

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
      user_id: parseInt(user_id),
      created_at: job.created_at,
      views: job.views || 0,
      applicantCount: job.applicantCount || 0,
    };

    console.log(`PUT /api/jobs/${id}: userId=${user_id}, updated jobId=${id}`);
    res.json(updatedJob);
  } catch (err) {
    console.error('updateJob Error:', { user_id, message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update job', details: err.message });
  } finally {
    if (conn) conn.release();
  }
};

const deleteJob = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
    const [job] = await pool.query(
      'SELECT * FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, parseInt(userId)]
    );
    if (!job.length) {
      console.log(`DELETE /api/jobs/${id}: No job found for userId=${userId}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    await pool.query('UPDATE jobs SET deleted_at = NOW() WHERE id = ? AND user_id = ?', [id, parseInt(userId)]);
    console.log(`DELETE /api/jobs/${id}: userId=${userId}`);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error(`deleteJob Error: id=${id}, userId=${userId}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error deleting job', details: err.message });
  }
};

const bulkDeleteJobs = async (req, res) => {
  const { jobIds, user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required', details: 'user_id is required in request body' });
  }

  try {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'Invalid input', details: 'jobIds must be a non-empty array' });
    }

    const [jobs] = await pool.query(
      'SELECT id FROM jobs WHERE id IN (?) AND user_id = ? AND deleted_at IS NULL',
      [jobIds, parseInt(user_id)]
    );
    const validJobIds = jobs.map(job => job.id);
    const invalidJobIds = jobIds.filter(id => !validJobIds.includes(id));

    if (invalidJobIds.length > 0) {
      console.log(`bulkDeleteJobs: Invalid job IDs for userId=${user_id}`, invalidJobIds);
      return res.status(404).json({ error: 'Some jobs not found', details: `Invalid job IDs: ${invalidJobIds.join(', ')}` });
    }

    await pool.query('UPDATE jobs SET deleted_at = NOW() WHERE id IN (?) AND user_id = ?', [jobIds, parseInt(user_id)]);
    console.log(`POST /api/jobs/bulk-delete: userId=${user_id}, deleted jobIds=`, jobIds);
    res.json({ message: 'Jobs deleted successfully' });
  } catch (err) {
    console.error(`bulkDeleteJobs Error: userId=${user_id}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error deleting jobs', details: err.message });
  }
};

const toggleJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status, user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required', details: 'user_id is required in request body' });
  }

  try {
    const [job] = await pool.query(
      'SELECT status FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, parseInt(user_id)]
    );
    if (!job.length) {
      console.log(`PATCH /api/jobs/${id}: No job found for userId=${user_id}`);
      return res.status(404).json({ error: 'Job not found', details: 'Job not found or you do not have access' });
    }

    const newStatus = status;
    await pool.query(
      'UPDATE jobs SET status = ? WHERE id = ? AND user_id = ?',
      [newStatus, id, parseInt(user_id)]
    );

    console.log(`PATCH /api/jobs/${id}: userId=${user_id}, newStatus=${newStatus}`);
    res.json({ message: 'Job status updated successfully', status: newStatus });
  } catch (err) {
    console.error(`toggleJobStatus Error: id=${id}, userId=${user_id}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error updating job status', details: err.message });
  }
};

const getUserApplications = async (req, res) => {
  const { candidate_id, search, status, page = 1, limit = 10 } = req.query;

  try {
    console.log('getUserApplications received:', {
      candidate_id: candidate_id || 'none',
      query: { search, status, page, limit },
    });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `
      SELECT a.*, j.title, j.company_name, j.location, j.salary, j.skills
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.deleted_at IS NULL
    `;
    const params = [];

    if (candidate_id) {
      query += ' AND a.candidate_id = ?';
      params.push(parseInt(candidate_id));
    }

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
      WHERE j.deleted_at IS NULL
      ${candidate_id ? ' AND a.candidate_id = ?' : ''}
      ${status && status !== 'All' ? ' AND a.status = ?' : ''}
      ${search ? ' AND (j.title LIKE ? OR j.company_name LIKE ? OR j.skills LIKE ?)' : ''}
    `;
    const countParams = [
      ...(candidate_id ? [parseInt(candidate_id)] : []),
      ...(status && status !== 'All' ? [status] : []),
      ...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []),
    ];

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
          return typeof app.skills === 'string' ? app.skills.split(',').map(skill => skill.trim()) : [];
        }
      })(),
    }));

    console.log(`GET /api/jobs/user-applications: candidate_id=${candidate_id || 'none'}, page=${page}, limit=${limit}, total=${total}`);
    res.status(200).json({
      jobs: applicationsWithParsedJSON,
      total,
    });
  } catch (err) {
    console.error(`getUserApplications Error: candidate_id=${candidate_id || 'none'}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching user applications', details: err.message });
  }
};



const getApplicantsByJob = async (req, res) => {
  const jobId = req.params.jobId;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required', details: 'userId query parameter is missing' });
  }

  try {
    const [job] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [jobId, parseInt(userId)]
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
          return typeof app.skills === 'string' ? app.skills.split(',').map(skill => skill.trim()) : [];
        }
      })(),
    }));

    console.log(`GET /api/jobs/${jobId}/applicants: userId=${userId}, found ${rows.length} applicants`);
    res.json(applicantsWithParsedJSON);
  } catch (err) {
    console.error('getApplicantsByJob Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching applicants', details: err.message });
  }
};

// Version 1: applyToJob without user_id in applications table
const applyToJob = async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  const { candidate_id } = req.body; // Optional candidate_id

  const requiredFields = ['fullName', 'email'];
  const validationError = validateRequiredFields(requiredFields, req.body, res);
  if (validationError) return validationError;

  try {
    const [jobExists] = await pool.query('SELECT id, status, title FROM jobs WHERE id = ? AND deleted_at IS NULL', [jobId]);
    if (!jobExists.length) return res.status(404).json({ error: 'Job not found' });
    if (jobExists[0].status !== 'Active') return res.status(400).json({ error: 'Job is inactive' });

    if (candidate_id) {
      const [existingApp] = await pool.query(
        'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
        [jobId, parseInt(candidate_id)]
      );
      if (existingApp.length) return res.status(400).json({ error: 'Application already exists' });
    }

    const resume = req.files?.resume ? path.join('Uploads', req.files.resume[0].filename) : null;
    const coverLetter = req.files?.coverLetter ? path.join('Uploads', req.files.coverLetter[0].filename) : null;

    const columns = [
      'job_id',
      'candidate_id',
      'user_id',
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
    ];
const values = [
  jobId, candidate_id, candidate_id, // 👈 using candidate_id also as user_id
  req.body.fullName, req.body.email, req.body.phone || null,
  req.body.location || null, req.body.experience || null, req.body.jobTitle || jobExists[0].title,
  req.body.company || null, req.body.qualification || null, req.body.specialization || null,
  req.body.university || null, req.body.skills ? JSON.stringify(req.body.skills) : null,
  resume, coverLetter, req.body.linkedIn || null, req.body.portfolio || null, req.body.status || 'Applied'
];
    const placeholders = columns.map(() => '?').join(',');
    const [result] = await pool.query(`INSERT INTO applications (${columns.join(',')}) VALUES (${placeholders})`, values);

    await pool.query('UPDATE jobs SET applicantCount = applicantCount + 1 WHERE id = ?', [jobId]);

    console.log(`POST /api/jobs/${jobId}/apply: candidate_id=${candidate_id || 'none'}, applicationId=${result.insertId}`);
    res.status(201).json({ message: 'Application submitted successfully', applicationId: result.insertId });
  } catch (err) {
    console.error(`applyToJob Error: jobId=${jobId}, candidate_id=${candidate_id || 'none'}`, { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error applying to job', details: err.message });
  }
};


export const getApplicantsForEmployer = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required', details: 'user_id query parameter is missing' });
  }

  try {
    const [jobs] = await pool.query('SELECT id, title FROM jobs WHERE user_id = ? AND deleted_at IS NULL', [parseInt(user_id)]);
    if (!jobs.length) {
      return res.json([]);
    }

    const jobIds = jobs.map(j => j.id);
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
          return typeof app.skills === 'string' ? app.skills.split(',').map(skill => skill.trim()) : [];
        }
      })(),
    }));

    console.log(`GET /api/jobs/applicants-for-employer: userId=${user_id}, found ${applicants.length} applicants`);
    res.json(applicantsWithParsedJSON);
  } catch (err) {
    console.error('getApplicantsForEmployer Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error fetching applicants', details: err.message });
  }
};

export default {
  getJobs,
  getPostedJobs,
  getJobById,
  getApplicantsByJob,
  getJobsByCategory,
  createJob,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  toggleJobStatus,
  applyToJob, // Use applyToJob (Version 1) or applyToJobWithUserId (Version 2) based on schema
  getApplications,
  getUserApplications,
 
  getInterviews,
  getAnalytics,
  getSkills,
  addSkill,
  getApplicantsForEmployer,
};