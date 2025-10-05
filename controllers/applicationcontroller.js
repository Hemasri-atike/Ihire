
import pool from "../config/db.js";


// Apply to a job (for job seekers)
export const createApplication = async (req, res) => {
  try {
    const {
      fullName, email, phone, location, experience,
      jobTitle, company, qualification, specialization,
      university, skills, coverLetter, linkedIn, portfolio,
      jobId
    } = req.body;

    const resume = req.file ? req.file.filename : null;
    const candidateId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'job_seeker') {
      return res.status(403).json({ error: "Forbidden", details: "Only job seekers can apply to jobs" });
    }

    // Validate jobId and get employer
    const [job] = await pool.execute("SELECT user_id AS employerId FROM jobs WHERE id = ?", [jobId]);
    if (job.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    const employerId = job[0].employerId;

    // Check if application already exists
    const [existing] = await pool.execute(
      "SELECT * FROM applications WHERE candidate_id = ? AND job_id = ?",
      [candidateId, jobId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Application already exists for this job" });
    }

    const query = `
      INSERT INTO applications
      (candidate_id, job_id, fullName, email, phone, location, experience,
       jobTitle, company, qualification, specialization, university, skills,
       resume, coverLetter, linkedIn, portfolio, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied')
    `;
    const [result] = await pool.execute(query, [
      candidateId, jobId, fullName || null, email || null, phone || null,
      location || null, experience || null, jobTitle || null, company || null,
      qualification || null, specialization || null, university || null, skills || null,
      resume || null, coverLetter || null, linkedIn || null, portfolio || null
    ]);

    res.status(201).json({ message: "Application submitted successfully", id: result.insertId });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: "Error creating application", details: error.message });
  }
};

// Get applications for a specific job (for employers)
export const getApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.user.id;
    const userRole = req.user.role;
    const { search = '', status = '', page = 1, limit = 4 } = req.query;

    if (userRole !== 'employer') {
      return res.status(403).json({ error: "Forbidden", details: "Only employers can view applications for their jobs" });
    }

    // Verify employer owns the job
    const [job] = await pool.execute("SELECT * FROM jobs WHERE id = ? AND user_id = ?", [jobId, employerId]);
    if (job.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "You do not have permission to view applications for this job" });
    }

    let query = `SELECT * FROM applications WHERE job_id = ?`;
    const queryParams = [jobId];

    if (search) {
      query += ` AND (fullName LIKE ? OR jobTitle LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    if (status && status !== 'All') {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await pool.execute(query, queryParams);

    // Count total
    let countQuery = `SELECT COUNT(*) AS total FROM applications WHERE job_id = ?`;
    const countParams = [jobId];
    if (search) countQuery += ` AND (fullName LIKE ? OR jobTitle LIKE ?)`;
    if (status && status !== 'All') countQuery += ` AND status = ?`;
    if (search) countParams.push(`%${search}%`, `%${search}%`);
    if (status && status !== 'All') countParams.push(status);

    const [totalResult] = await pool.execute(countQuery, countParams);

    res.status(200).json({
      applicants: rows.map(row => ({
        id: row.id,
        name: row.fullName,
        email: row.email,
        phone: row.phone,
        location: row.location,
        experience: row.experience,
        position: row.jobTitle,
        company: row.company,
        qualification: row.qualification,
        specialization: row.specialization,
        university: row.university,
        skills: row.skills,
        resumeUrl: row.resume ? `http://localhost:5000/resumes/${row.resume}` : null,
        coverLetter: row.coverLetter,
        linkedIn: row.linkedIn,
        portfolio: row.portfolio,
        status: row.status,
        applicationDate: row.createdAt,
        interviewDate: row.interviewDate,
        jobId: row.job_id,
        candidateId: row.candidate_id
      })),
      total: totalResult[0].total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: "Error fetching applications", details: error.message });
  }
};

// Update application status (for employers)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, interviewDate } = req.body;
    const employerId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'employer') {
      return res.status(403).json({ error: "Forbidden", details: "Only employers can update application status" });
    }

    // Verify employer owns the job
    const [rows] = await pool.execute(
      `SELECT a.id, j.user_id AS ownerId FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = ?`,
      [applicationId]
    );

    if (rows.length === 0 || rows[0].ownerId !== employerId) {
      return res.status(403).json({ error: "Forbidden", details: "You do not have permission to update this application" });
    }

    const validStatuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await pool.execute(
      `UPDATE applications SET status = ?, interview_date = ? WHERE id = ?`,
      [status, status === 'Interview Scheduled' ? interviewDate || null : null, applicationId]
    );

    res.status(200).json({ id: applicationId, status, interviewDate: status === 'Interview Scheduled' ? interviewDate || null : null });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: "Error updating application status", details: error.message });
  }
};

// Get user's applications
export const getUserApplications = async (req, res) => {
  try {
    const userId = parseInt(req.query?.id, 10); // Ensure integer
    console.log("df",userId)
    const userRole = req.user?.role;

    if (!userId || isNaN(userId) || userRole !== "job_seeker") {
      return res.status(403).json({ error: "Forbidden", details: "Only job seekers can access their applied jobs" });
    }

    // Pagination and filters
    const limit = parseInt(req.query.limit, 10) || 4;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.search || "";
    const statusFilter = req.query.status || "All";

    // Validate numeric parameters
    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid parameters", details: "Limit and page must be valid numbers" });
    }

    // Build main query
    let sql = `
      SELECT 
        a.id,
        a.job_id,
        a.status,
        a.createdAt,
        j.title,
        j.company_name,
        j.location,
        j.salary
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ?
    `;
    const queryParams = [userId];

    // Add search condition
    if (searchQuery) {
      sql += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
      queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Add status filter condition
    if (statusFilter && statusFilter !== "All") {
      sql += ` AND a.status = ?`;
      queryParams.push(statusFilter);
    }

    sql += ` ORDER BY a.createdAt DESC LIMIT ${limit} OFFSET ${offset}`;
   

    // Log query and parameters for debugging
    console.log("Executing main query:", sql);
    console.log("Main query parameters:", queryParams);

    // Execute main query
    const [applications] = await pool.execute(sql, queryParams);
console.log("Sdf",applications)
    // Build count query
    let countSql = `
      SELECT COUNT(*) AS total 
      FROM applications a 
      LEFT JOIN jobs j ON a.job_id = j.id 
      WHERE a.candidate_id = ?
    `;
    const countParams = [userId];

    if (searchQuery) {
      countSql += ` AND (j.title LIKE ? OR j.company_name LIKE ?)`;
      countParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (statusFilter && statusFilter !== "All") {
      countSql += ` AND a.status = ?`;
      countParams.push(statusFilter);
    }

    // Log count query and parameters for debugging
    console.log("Executing count query:", countSql);
    console.log("Count query parameters:", countParams.map((param) => typeof param + ":" + param));

    // Execute count query
    const [totalResult] = await pool.execute(countSql, countParams);

    // Format response
    res.status(200).json({
      jobs: applications.map((row) => ({
        id: row.id,
        job_id: row.job_id,
        title: row.title || "N/A",
        company_name: row.company_name || "N/A",
        location: row.location || "N/A",
        salary: row.salary || "Not disclosed",
        tags: row.tags ? row.tags.split(",") : [], // Fallback to empty array if tags is absent
        status: row.status || "Applied",
        createdAt: row.createdAt || new Date().toISOString(),
        recruiterActions: {
          invitationSent: !!row.interviewDate,
          resumeDownloaded: false, // Update if tracking resume downloads
        },
      })),
      total: totalResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("Error fetching user applications:", err);
    res.status(500).json({ error: "Error fetching applications", details: err.message });
  }
};

export const getApplicantsByJob = async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ error: "Job ID is required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.*, j.jobTitle, j.company, j.user_id AS employerId
       FROM applications a
       JOIN jobs j ON a.jobId = j.id
       WHERE a.jobId = ?`,
      [jobId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No applicants found for this job" });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching applicants by job:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
};
export const getApplicantsByUserJobs = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
  const [rows] = await pool.query(
  `SELECT 
      a.*, 
      j.title, 
      j.company_name AS company, 
      j.id AS jobId
   FROM applications a
   JOIN jobs j ON a.job_id = j.id
   WHERE j.user_id = ?`,
  [userId]
);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No applicants found for your jobs" });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching applicants by user jobs:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
};
export const getApplicants = async (req, res) => {
  const employerId = req.user.id; // authenticated employer

  try {
    const conn = await pool.getConnection();

    // Fetch all jobs for this employer that are not deleted
    const [jobs] = await conn.query(
      `SELECT id FROM jobs WHERE user_id = ? AND deleted_at IS NULL`,
      [employerId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        error: "No jobs found",
        details: "You have not posted any active jobs"
      });
    }

    // Get job IDs
    const jobIds = jobs.map(job => job.id);

    // Fetch all applicants for these jobs
    const [applicants] = await conn.query(
      `SELECT 
        a.id, a.fullName, a.email, a.phone, a.location, a.experience, a.jobTitle,
        a.company, a.qualification, a.specialization, a.university, a.skills,
        a.resume, a.coverLetter, a.linkedIn, a.portfolio, a.createdAt,
        a.job_id, a.user_id AS candidate_user_id, a.candidate_id, a.status, a.notes
      FROM applications a
      WHERE a.job_id IN (?)`,
      [jobIds]
    );

    conn.release();
    res.json(applicants);

  } catch (error) {
    console.error("Fetch applicants error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Update application status (for employers)
export const updateApplicantStatus = async (req, res) => {
  try {
    const { id } = req.params; // application ID
    const { status, notes } = req.body;
    const userId = req.user.id; // authenticated employer ID
    const userRole = req.user.role;

    if (userRole !== 'employer') {
      return res.status(403).json({ error: "Forbidden", details: "Only employers can update application status" });
    }

    const validStatuses = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Hired", "Rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Verify employer owns the job related to this application
 // Correct way to check ownership and update status
const [rows] = await pool.query(
  `SELECT a.id, j.user_id AS ownerId
   FROM applications a
   JOIN jobs j ON a.job_id = j.id
   WHERE a.id = ?`,
  [applicationId]
);

if (rows.length === 0 || rows[0].ownerId !== req.user.id) {
  return res.status(403).json({ error: "Forbidden", details: "You don't have permission to update this applicant" });
}

// Update the application
await pool.query(
  `UPDATE applications
   SET status = ?, interview_date = ?
   WHERE id = ?`,
  [status, interviewDate || null, applicationId]
);


if (rows.length === 0 || rows[0].ownerId !== req.user.id) {
  return res.status(403).json({ error: "Forbidden", details: "You don't have permission to update this applicant" });
}

// Update the application
await pool.query(
  `UPDATE applications 
   SET status = ?, interview_date = ? 
   WHERE id = ?`,
  [status, interviewDate || null, applicationId]
);


    if (rows.length === 0 || rows[0].ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden", details: "You don't have permission to update this applicant" });
    }

    // Update application status and notes
    await pool.query(
      `UPDATE applications 
       SET status = ?, notes = ?
       WHERE id = ?`,
      [
        status || rows[0].status,
        notes || null,
        id
      ]
    );

    res.json({ message: "Applicant status updated successfully", id, status, notes });

  } catch (error) {
    console.error("Error updating applicant status:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
};

// Add note to applicant
export const addApplicantNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const [check] = await pool.query(
      `SELECT a.id, j.user_id AS ownerId
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = ?`,
      [id]
    );

    if (check.length === 0 || check[0].ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden", details: "Not your applicant" });
    }

    await pool.query(`UPDATE applications SET notes = ? WHERE id = ?`, [notes, id]);
    res.json({ message: "Note added successfully", id, notes });

  } catch (error) {
    console.error("Error adding applicant note:", error);
    res.status(500).json({ error: "Error adding note", details: error.message });
  }
};

// Schedule interview
export const scheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { interviewDate, interviewMode, interviewLink } = req.body;
    const userId = req.user.id;

    const [check] = await pool.query(
      `SELECT a.id, j.user_id AS ownerId
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = ?`,
      [id]
    );

    if (check.length === 0 || check[0].ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden", details: "Not your applicant" });
    }

    await pool.query(
      `UPDATE applications 
       SET interview_date = ?, interview_mode = ?, interview_link = ?, status = 'Interview Scheduled'
       WHERE id = ?`,
      [interviewDate, interviewMode || 'Online', interviewLink || null, id]
    );

    res.json({ message: "Interview scheduled successfully", id, interviewDate, interviewMode, interviewLink });

  } catch (error) {
    console.error("Error scheduling interview:", error);
    res.status(500).json({ error: "Error scheduling interview", details: error.message });
  }
};

// Delete applicant
export const deleteApplicant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [check] = await pool.query(
      `SELECT a.id, j.user_id AS ownerId
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = ?`,
      [id]
    );

    if (check.length === 0 || check[0].ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden", details: "Not your applicant" });
    }

    await pool.query(`DELETE FROM applications WHERE id = ?`, [id]);
    res.json({ message: "Applicant deleted successfully", id });

  } catch (error) {
    console.error("Error deleting applicant:", error);
    res.status(500).json({ error: "Error deleting applicant", details: error.message });
  }
};



