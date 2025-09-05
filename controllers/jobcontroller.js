// controllers/jobcontroller.js
import pool from "../config/db.js";

const validStatuses = ["Active", "Closed", "Draft", "Pending Review"];

// Map frontend sort fields (camelCase) to database columns (snake_case)
const sortFieldMap = {
  createdAt: "created_at",
  applicantCount: "(SELECT COUNT(*) FROM applications WHERE job_id = jobs.id)",
  views: "views",
  title: "title",
};

const getJobs = async (req, res) => {
  try {
    const { status, search, category, sortBy = "createdAt-desc", page = 1, limit = 10 } = req.query;
    const userId = req.user?.id; // From authenticate middleware
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: No user ID provided" });
    }

    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT id, title, description, location, salary, company_name, status, tags, 
             recruiterActions, category, deadline, views, type, experience, created_at,
             (SELECT COUNT(*) FROM applications WHERE id = jobs.id) AS applicantCount 
      FROM jobs 
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const params = [userId];

    // Filter by status
    if (status && status !== "All" && validStatuses.includes(status)) {
      baseQuery += " AND status = ?";
      params.push(status);
    }

    // Search by title, description, or company
    if (search) {
      baseQuery += " AND (title LIKE ? OR description LIKE ? OR company_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filter by category
    if (category) {
      baseQuery += " AND category = ?";
      params.push(category);
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT .*? FROM/, "SELECT COUNT(*) AS count FROM");
    const [totalResult] = await pool.query(countQuery, params);
    console.log("Count Query:", countQuery, "Params:", params, "Result:", totalResult); // Debug log
    const total = totalResult[0]?.count ?? 0; // Fallback to 0 if no rows

    // Sorting
    const [sortField, sortOrder] = sortBy.split("-");
    const dbField = sortFieldMap[sortField] || sortFieldMap.createdAt;
    if (!sortFieldMap[sortField] && sortField !== "createdAt") {
      throw new Error(`Invalid sort field: ${sortField}`);
    }
    const order = sortOrder === "asc" ? "ASC" : "DESC";
    baseQuery += ` ORDER BY ${dbField} ${order}`;

    // Pagination
    baseQuery += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [jobs] = await pool.query(baseQuery, params);
    console.log("Jobs Query:", baseQuery, "Params:", params, "Jobs:", jobs); // Debug log

    // Parse JSON fields and format dates
    const jobsWithParsedJSON = jobs.map((job) => ({
      ...job,
      tags: (() => {
        try {
          return JSON.parse(job.tags || "[]");
        } catch {
          return typeof job.tags === "string" ? job.tags.split(",") : [];
        }
      })(),
      recruiterActions: (() => {
        try {
          return JSON.parse(job.recruiterActions || '{"invitationSent": false, "resumeDownloaded": false}');
        } catch {
          return { invitationSent: false, resumeDownloaded: false };
        }
      })(),
      deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
      createdAt: job.created_at ? new Date(job.created_at).toISOString() : null,
    }));

    res.json({ jobs: jobsWithParsedJSON, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("Error in getJobs:", err);
    res.status(500).json({ error: "Error fetching jobs", details: err.message });
  }
};

// In jobcontroller.js
const createJob = async (req, res) => {
  const {
    title,
    description,
    location,
    salary,
    company_name,
    status,
    tags,
    recruiterActions,
    category,
    deadline,
    type,
    experience,
    role,
    vacancies,
    contactPerson,
    startDate,
  } = req.body;
  const user_id = req.user.id;

  // Validate required fields
  if (!title || !description || !location || !company_name) {
    return res.status(400).json({ error: "Missing required fields: title, description, location, company_name" });
  }
  if (salary && (isNaN(salary) || salary < 0)) {
    return res.status(400).json({ error: "Salary must be a non-negative number" });
  }

  try {
    // Insert job
    const [result] = await pool.query(
      `INSERT INTO jobs 
       (title, description, location, salary, company_name, user_id, status, tags, recruiterActions, category, deadline, type, experience, role, vacancies, contactPerson, startDate, views, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        title,
        description,
        location,
        salary || null,
        company_name,
        user_id,
        status || "Draft",
        JSON.stringify(tags || []),
        JSON.stringify(recruiterActions || { invitationSent: false, resumeDownloaded: false }),
        category || null,
        deadline || null,
        type || null,
        experience || null,
        role || null,
        vacancies || null,
        contactPerson || null,
        startDate || null,
      ]
    );

    const jobId = result.insertId;

    // Insert audit log (with error handling)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, details, created_at) 
         VALUES (?, ?, ?, NOW())`,
        [user_id, "create_job", JSON.stringify({ jobId, title })]
      );
    } catch (auditError) {
      console.error("Failed to insert audit log:", auditError.message);
      // Continue without failing the job creation
    }

    return res.status(201).json({ message: "Job created successfully", jobId });
  } catch (err) {
    console.error("Error creating job:", err);
    return res.status(500).json({ error: "Error creating job", details: err.message });
  }
};

const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, salary, company_name, status, tags, recruiterActions, category, deadline, type, experience } = req.body;
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized: No user ID provided" });
  }

  // Validation
  if (!title || !description || !location || !company_name) {
    return res.status(400).json({ error: "Missing required fields: title, description, location, company_name" });
  }
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }
  if (salary && (isNaN(salary) || salary < 0)) {
    return res.status(400).json({ error: "Salary must be a non-negative number" });
  }
  if (deadline && isNaN(Date.parse(deadline))) {
    return res.status(400).json({ error: "Invalid deadline format" });
  }

  try {
    const [job] = await pool.query("SELECT user_id FROM jobs WHERE id = ? AND deleted_at IS NULL", [id]);
    if (!job[0]) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (job[0].user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized to update this job" });
    }

    await pool.query(
      `UPDATE jobs SET 
        title = ?, description = ?, location = ?, salary = ?, company_name = ?, 
        status = ?, tags = ?, recruiterActions = ?, category = ?, deadline = ?, type = ?, experience = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        title,
        description,
        location,
        salary || null,
        company_name,
        status || "Draft",
        JSON.stringify(tags || []),
        JSON.stringify(recruiterActions || { invitationSent: false, resumeDownloaded: false }),
        category || null,
        deadline || null,
        type || null,
        experience || null,
        id,
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)`,
      [user_id, "update_job", `Updated job with ID ${id}`]
    );

    res.json({ message: "Job updated successfully" });
  } catch (err) {
    console.error("Error in updateJob:", err);
    res.status(500).json({ error: "Error updating job", details: err.message });
  }
};

const deleteJob = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized: No user ID provided" });
  }

  try {
    const [job] = await pool.query("SELECT user_id FROM jobs WHERE id = ? AND deleted_at IS NULL", [id]);
    if (!job[0]) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (job[0].user_id !== user_id) {
      return res.status(403).json({ error: "Unauthorized to delete this job" });
    }

    await pool.query("UPDATE jobs SET deleted_at = NOW() WHERE id = ?", [id]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)`,
      [user_id, "delete_job", `Soft-deleted job with ID ${id}`]
    );

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("Error in deleteJob:", err);
    res.status(500).json({ error: "Error deleting job", details: err.message });
  }
};

const bulkDeleteJobs = async (req, res) => {
  const { jobIds } = req.body;
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized: No user ID provided" });
  }

  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return res.status(400).json({ error: "Invalid or empty jobIds array" });
  }

  try {
    const [jobs] = await pool.query("SELECT id FROM jobs WHERE id IN (?) AND user_id = ? AND deleted_at IS NULL", [jobIds, user_id]);
    if (jobs.length !== jobIds.length) {
      return res.status(403).json({ error: "Unauthorized to delete some jobs" });
    }

    await pool.query("UPDATE jobs SET deleted_at = NOW() WHERE id IN (?)", [jobIds]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)`,
      [user_id, "bulk_delete_jobs", `Soft-deleted ${jobIds.length} jobs`]
    );

    res.json({ message: `${jobIds.length} job(s) deleted successfully` });
  } catch (err) {
    console.error("Error in bulkDeleteJobs:", err);
    res.status(500).json({ error: "Error deleting jobs", details: err.message });
  }
};

const incrementJobViews = async (req, res) => {
  const { id } = req.params;

  try {
    const [job] = await pool.query("SELECT id FROM jobs WHERE id = ? AND deleted_at IS NULL", [id]);
    if (!job[0]) {
      return res.status(404).json({ error: "Job not found" });
    }

    await pool.query("UPDATE jobs SET views = views + 1 WHERE id = ?", [id]);
    res.json({ message: "Job views incremented" });
  } catch (err) {
    console.error("Error in incrementJobViews:", err);
    res.status(500).json({ error: "Error incrementing views", details: err.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query("SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL AND deleted_at IS NULL");
    res.json(categories.map((c) => c.category).filter(Boolean));
  } catch (err) {
    console.error("Error in getCategories:", err);
    res.status(500).json({ error: "Error fetching categories", details: err.message });
  }
};

export default { getJobs, createJob, updateJob, deleteJob, bulkDeleteJobs, incrementJobViews, getCategories };