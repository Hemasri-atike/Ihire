import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import multer, { MulterError } from 'multer'; // Import multer and MulterErro
import upload from "../middleware/upload.js"

// getJobs function (with added debug logging)
const getJobs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 4 } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    // Normalize "all"
    if (status && status.toLowerCase() !== 'all') {
      baseQuery += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      baseQuery += ' AND (title LIKE ? OR company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count total
    const [totalResult] = await pool.query(baseQuery, params);
    const total = totalResult.length;

    // Paginated query
    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    const [jobs] = await pool.query(paginatedQuery, [...params, parseInt(limit), parseInt(offset)]);
    console.log('getJobs: query results', { jobs, total, query: paginatedQuery, params }); // Debug

    // Parse JSON fields
    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',') : [];
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
    }));

    res.json({
      jobs: jobsWithParsedJSON,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('getJobs error:', err);
    res.status(500).json({ message: 'Error fetching jobs', details: err.message });
  }
};

const getJobsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const [jobs] = await pool.query('SELECT * FROM jobs WHERE JSON_CONTAINS(tags, ?)', [
      JSON.stringify([category]),
    ]);
    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',') : [];
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
    }));

    res.json({ jobs: jobsWithParsedJSON });
  } catch (err) {
    console.error('getJobsByCategory error:', err);
    res.status(500).json({ message: 'Error fetching jobs by category', details: err.message });
  }
};

const createJob = async (req, res) => {
  const { title, description, location, salary, company_name, status, tags, recruiterActions } = req.body;
  const user_id = req.user.id;

  try {
    const [result] = await pool.query(
      `INSERT INTO jobs 
       (title, description, location, salary, company_name, user_id, status, tags, recruiterActions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        location,
        salary,
        company_name,
        user_id,
        status || 'Open', // ✅ default to Open
        JSON.stringify(tags || []),
        JSON.stringify(recruiterActions || { invitationSent: false, resumeDownloaded: false }),
      ]
    );

    res.json({ message: 'Job created successfully', jobId: result.insertId });
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Error creating job', details: err.message });
  }
};


const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, salary, company_name, status, tags, recruiterActions } = req.body;

  try {
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
       WHERE id = ?`,
      [
        title,
        description,
        location,
        salary,
        company_name,
        status,
        JSON.stringify(tags || []),
        JSON.stringify(recruiterActions || { invitationSent: false, resumeDownloaded: false }),
        id,
      ]
    );

    res.json({ message: 'Job updated successfully' });
  } catch (err) {
    console.error('updateJob error:', err);
    res.status(500).json({ message: 'Error updating job', details: err.message });
  }
};

const deleteJob = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM jobs WHERE id = ?', [id]);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('deleteJob error:', err);
    res.status(500).json({ message: 'Error deleting job', details: err.message });
  }
};

const applyToJob = async (req, res) => {
  upload.single('resume')(req, res, async (err) => {
    if (err instanceof MulterError) {
      return res.status(400).json({ message: 'File upload error', details: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const {
        job_id,
        candidate_id,
        name,
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
        coverLetter,
        linkedIn,
        portfolio,
        status,
      } = req.body;

      const resume = req.file;
      const resume_path = resume ? `resumes/${resume.filename}` : null;

      if (!job_id || !candidate_id || !name || !email) {
        return res.status(400).json({ message: 'Missing required fields: job_id, candidate_id, name, email' });
      }

      // Check for duplicate application
      const [existingApp] = await pool.query(
        'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
        [job_id, candidate_id]
      );
      if (existingApp.length) {
        return res.status(400).json({ message: 'You have already applied to this job' });
      }

      // Insert application
      const [result] = await pool.query(
        `INSERT INTO applications
         (job_id, candidate_id, fullName, email, phone, location, experience, jobTitle, company, qualification, specialization, university, skills, coverLetter, linkedIn, portfolio, resume, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          job_id,
          candidate_id,
          name,
          email,
          phone || null,
          location || null,
          experience || null,
          jobTitle || null,
          company || null,
          qualification || null,
          specialization || null,
          university || null,
          skills || null,
          coverLetter || null,
          linkedIn || null,
          portfolio || null,
          resume_path,
          status || 'applied'
        ]
      );

      res.json({ message: 'Applied successfully', applicationId: result.insertId });

    } catch (err) {
      console.error('applyToJob error:', err);
      res.status(500).json({ message: 'Error applying to job', details: err.message });
    }
  });
};



const getApplications = async (req, res) => {
  const { jobId } = req.params;

  try {
    const [applications] = await pool.query('SELECT * FROM applications WHERE job_id = ?', [jobId]);
    res.json(applications);
  } catch (err) {
    console.error('getApplications error:', err);
    res.status(500).json({ message: 'Error fetching applications', details: err.message });
  }
};

const getUserApplications = async (req, res) => {
  const { candidate_id } = req.query;

  try {
    const [applications] = await pool.query('SELECT job_id FROM applications WHERE candidate_id = ?', [candidate_id]);
    res.json(applications);
  } catch (err) {
    console.error('getUserApplications error:', err);
    res.status(500).json({ message: 'Error fetching user applications', details: err.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const [jobs] = await pool.query('SELECT tags FROM jobs');
    const allTags = jobs
      .flatMap((job) => {
        try {
          return JSON.parse(job.tags || '[]');
        } catch {
          return typeof job.tags === 'string' ? job.tags.split(',') : [];
        }
      })
      .filter((tag) => tag)
      .map((tag) => tag.trim());
    const uniqueCategories = [...new Set(allTags)];
    res.json(uniqueCategories);
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ message: 'Error fetching categories', details: err.message });
  }
};

export default {
  getJobs,
  getJobsByCategory,
  createJob,
  updateJob,
  deleteJob,
  applyToJob: [upload.single('resume'), applyToJob],
  getApplications,
  getUserApplications,
  getCategories,
};