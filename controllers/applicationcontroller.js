// controllers/applicationController.js
import pool from "../config/db.js"


const applicationController = {
  // Apply for a job
  async apply(req, res) {
    try {
      const { job_id } = req.body;
      const user_id = req.user.id; // From JWT middleware

      // Check if already applied
      const [existing] = await pool.query(
        "SELECT * FROM applications WHERE user_id = ? AND job_id = ?",
        [user_id, job_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "Already applied for this job" });
      }

      await pool.query(
        "INSERT INTO applications (user_id, job_id) VALUES (?, ?)",
        [user_id, job_id]
      );

      res.status(201).json({ message: "Application submitted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get user’s applications
  async getUserApplications(req, res) {
    try {
      const user_id = req.user.id;
      const [applications] = await pool.query(
        "SELECT a.*, j.title FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.user_id = ?",
        [user_id]
      );

      res.json({ applications });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
};

export default applicationController;