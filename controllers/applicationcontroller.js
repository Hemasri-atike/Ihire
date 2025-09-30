
import pool from "../config/db.js";

// Apply to a job (for job seekers)
export const createApplication = async (req, res) => {
  try {
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
      coverLetter,
      linkedIn,
      portfolio,
      jobId, // Required to link application to a specific job
    } = req.body;

    const resume = req.file ? req.file.filename : null;
    const candidateId = req.user.id; // From authenticate middleware
    const userRole = req.user.role; // From authenticate middleware

    if (userRole !== 'job_seeker') {
      return res.status(403).json({ error: "Forbidden", details: "Only job seekers can apply to jobs" });
    }

    // Validate jobId and get employerId
    const [job] = await pool.execute("SELECT employerId FROM jobs WHERE id = ?", [jobId]);
    if (job.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    const employerId = job[0].employerId;

    // Check if application already exists
    const [existing] = await pool.execute(
      "SELECT * FROM applications WHERE candidateId = ? AND jobId = ?",
      [candidateId, jobId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Application already exists for this job" });
    }

    const query = `
      INSERT INTO applications 
      (candidateId, jobId, employerId, fullName, email, phone, location, experience, jobTitle, company, qualification, specialization, university, skills, resume, coverLetter, linkedIn, portfolio, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied')
    `;

    const [result] = await pool.execute(query, [
      candidateId,
      jobId,
      employerId,
      fullName || null,
      email || null,
      phone || null,
      location || null,
      experience || null,
      jobTitle || null,
      company || null,
      qualification || null,
      specialization || null,
      university || null,
      skills || null,
      resume || null,
      coverLetter || null,
      linkedIn || null,
      portfolio || null,
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
    const [job] = await pool.execute("SELECT * FROM jobs WHERE id = ? AND employerId = ?", [jobId, employerId]);
    if (job.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "You do not have permission to view applications for this job" });
    }

    let query = `
      SELECT * FROM applications 
      WHERE jobId = ? AND employerId = ?
    `;
    const queryParams = [jobId, employerId];

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
    const [totalResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM applications WHERE jobId = ? AND employerId = ?${search ? ' AND (fullName LIKE ? OR jobTitle LIKE ?)' : ''}${status && status !== 'All' ? ' AND status = ?' : ''}`,
      search ? [jobId, employerId, `%${search}%`, `%${search}%`, ...(status && status !== 'All' ? [status] : [])] : [jobId, employerId, ...(status && status !== 'All' ? [status] : [])]
    );

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
        jobId: row.jobId,
        candidateId: row.candidateId,
      })),
      total: totalResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: "Error fetching applications", details: error.message });
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
    const [application] = await pool.execute(
      "SELECT * FROM applications WHERE id = ? AND employerId = ?",
      [applicationId, employerId]
    );
    if (application.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "You do not have permission to update this application" });
    }

    const validStatuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const query = `
      UPDATE applications 
      SET status = ?, interviewDate = ? 
      WHERE id = ? AND employerId = ?
    `;
    await pool.execute(query, [
      status,
      status === 'Interview Scheduled' ? interviewDate || null : null,
      applicationId,
      employerId,
    ]);

    res.status(200).json({ id: applicationId, status, interviewDate: status === 'Interview Scheduled' ? interviewDate || null : null });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: "Error updating application status", details: error.message });
  }
};