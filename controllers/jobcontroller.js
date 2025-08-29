// controllers/jobcontroller.js
import db from "../config/db.js";


const getJobs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 4 } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = "SELECT * FROM jobs WHERE 1=1";
    const params = [];

    // Filter by status
    if (status && status !== "All") {
      baseQuery += " AND status = ?";
      params.push(status);
    }

    // Search by title or company
    if (search) {
      baseQuery += " AND (title LIKE ? OR company_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const [totalResult] = await db.query(baseQuery, params);
    const total = totalResult.length;

    // Pagination
    baseQuery += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [jobs] = await db.query(baseQuery, params);

    // Safe parsing for tags and recruiterActions
    const jobsWithParsedJSON = jobs.map(job => ({
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
      })()
    }));

    res.json({ jobs: jobsWithParsedJSON, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching jobs", details: err.message });
  }
};



// CREATE job
const createJob = async (req, res) => {
  const { title, description, location, salary, company_name, status, tags, recruiterActions } = req.body;
  const user_id = req.user.id; // From authenticate middleware

  try {
    const [result] = await db.query(
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
        status || "Shortlisted",
        JSON.stringify(tags || []),
        JSON.stringify(recruiterActions || { invitationSent: false, resumeDownloaded: false })
      ]
    );

    res.json({ message: "Job created successfully", jobId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Error creating job", details: err.message });
  }
};

// UPDATE job
const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, salary, company_name, status, tags, recruiterActions } = req.body;

  try {
    await db.query(
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
        id
      ]
    );

    res.json({ message: "Job updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error updating job", details: err.message });
  }
};

// DELETE job
const deleteJob = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM jobs WHERE id=?", [id]);
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting job", details: err.message });
  }
};

export default { getJobs, createJob, updateJob, deleteJob };
