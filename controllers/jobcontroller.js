// controllers/jobController.js
import pool from "../config/db.js"

const jobController = {
  // Create a new job (employer only)
  async createJob(req, res) {
    try {
      const { title, description, location, salary } = req.body;
      const company_id = req.user.id; // From JWT middleware

      if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
      }

      const [result] = await pool.query(
        "INSERT INTO jobs (title, description, company_id, location, salary) VALUES (?, ?, ?, ?, ?)",
        [title, description, company_id, location || null, salary || null]
      );

      res.status(201).json({ message: "Job created", jobId: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get all jobs
  async getJobs(req, res) {
    try {
      const [jobs] = await pool.query("SELECT * FROM jobs");
      res.json({ jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get job by ID
  async getJobById(req, res) {
    try {
      const { id } = req.params;
      const [jobs] = await pool.query("SELECT * FROM jobs WHERE id = ?", [id]);

      if (jobs.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json({ job: jobs[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
};

export default jobController;