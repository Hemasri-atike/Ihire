import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import multer, { MulterError } from 'multer'; // Import multer and MulterErro
import upload from "../middleware/upload.js";


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
    
    res.status(500).json({ message: 'Error updating job', details: err.message });
  }
};

const deleteJob = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM jobs WHERE id = ?', [id]);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
   
    res.status(500).json({ message: 'Error deleting job', details: err.message });
  }
};





const getApplications = async (req, res) => {
  const { jobId } = req.params;

  try {
    const [applications] = await pool.query('SELECT * FROM applications WHERE job_id = ?', [jobId]);
    res.json(applications);
  } catch (err) {
 
    res.status(500).json({ message: 'Error fetching applications', details: err.message });
  }
};

const getUserApplications = async (req, res) => {
  const { candidate_id } = req.query;

  try {
    const [applications] = await pool.query('SELECT job_id FROM applications WHERE candidate_id = ?', [candidate_id]);
    res.json(applications);
  } catch (err) {
   
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
   
    res.status(500).json({ message: 'Error fetching categories', details: err.message });
  }
};






const applyToJob = async (req, res) => {
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "coverLetter", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err instanceof MulterError) {
      return res.status(400).json({
        error: "File upload error",
        details: err.message,
      });
    } else if (err) {
      return res.status(400).json({
        error: "File upload error",
        details: err.message,
      });
    }

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

      // Use candidate_id from auth if available
      const finalCandidateId = req.user?.id || candidate_id;
      if (!finalCandidateId) {
        return res.status(401).json({
          error: "Authentication required",
          details: "Candidate ID is missing. Please log in.",
        });
      }

      // Validate required fields
      if (!job_id || !fullName || !email || !phone || !req.files?.resume) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "job_id, fullName, email, phone, and resume are required",
        });
      }

      // Validate job_id is a number
      const jobIdNum = parseInt(job_id, 10);
      if (isNaN(jobIdNum)) {
        return res.status(400).json({
          error: "Invalid job_id",
          details: "job_id must be a valid number",
        });
      }

      // Validate candidate_id is a number
      const candidateIdNum = parseInt(finalCandidateId, 10);
      if (isNaN(candidateIdNum)) {
        return res.status(400).json({
          error: "Invalid candidate_id",
          details: "candidate_id must be a valid number",
        });
      }

      // Validate job_id exists
      const [jobExists] = await pool.query("SELECT id FROM jobs WHERE id = ?", [jobIdNum]);
      if (!jobExists.length) {
        return res.status(400).json({
          error: "Invalid job_id",
          details: `Job with ID ${job_id} does not exist`,
        });
      }

      // Validate candidate_id exists
      const [userExists] = await pool.query("SELECT id FROM users WHERE id = ?", [
        candidateIdNum,
      ]);
      if (!userExists.length) {
        return res.status(400).json({
          error: "Invalid candidate_id",
          details: `User with ID ${finalCandidateId} does not exist`,
        });
      }

      // Check for duplicate application
      const [existingApp] = await pool.query(
        "SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?",
        [jobIdNum, candidateIdNum]
      );
      if (existingApp.length) {
        return res.status(400).json({
          error: "Application already exists for this job",
          details: "You have already applied to this job",
        });
      }

      // Handle file paths
      const resume_path = req.files?.resume ? `resumes/${req.files.resume[0].filename}` : null;
      const coverLetter_path = req.files?.coverLetter
        ? `coverLetters/${req.files.coverLetter[0].filename}`
        : null;

      // Insert application
      const [result] = await pool.query(
        `INSERT INTO applications
         (job_id, candidate_id, fullName, email, phone, location, experience, jobTitle, company,
          qualification, specialization, university, skills, coverLetter, linkedIn, portfolio, resume, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          jobIdNum,
          candidateIdNum,
          fullName,
          email,
          phone || null,
          experience ? parseInt(experience, 10) : null,
          jobTitle || null,
          company || null,
          qualification || null,
          specialization || null,
          university || null,
          skills || null,
          coverLetter_path,
          linkedIn || null,
          portfolio || null,
          resume_path,
          status || "applied",
        ]
      );

      res.status(201).json({
        message: "Application submitted successfully",
        applicationId: result.insertId,
      });
    } catch (err) {
      console.error("Backend error:", err);
      let errorDetails = err.message;
      if (err.code === "ER_NO_REFERENCED_ROW_2") {
        errorDetails = "Invalid job_id or candidate_id. Ensure the job and user exist.";
      } else if (err.code === "ER_DUP_ENTRY") {
        errorDetails = "Application already exists for this job.";
      } else if (err.message.includes("job_id")) {
        errorDetails = "Invalid or missing job_id. Please select a valid job.";
      } else if (err.message.includes("candidate_id")) {
        errorDetails = "Invalid or missing candidate_id. Please log in.";
      }
      res.status(500).json({
        error: "Error creating application",
        details: errorDetails,
      });
    }
  });
};



export default {
  getJobs,
  getJobsByCategory,
  createJob,
  updateJob,
  deleteJob,
    applyToJob,
  applyToJob: [upload.single('resume'), applyToJob],
  getApplications,
  getUserApplications,
  getCategories,
};