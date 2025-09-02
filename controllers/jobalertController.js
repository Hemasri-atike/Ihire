import pool from "../config/db.js";

// ✅ Create Job Alert
export const createJobAlert = async (req, res) => {
  const { keywords, location, salary_min, salary_max, job_type, frequency } = req.body;
  const userId = req.user.id;

  try {
    const [result] = await pool.query(
      `INSERT INTO job_alerts (user_id, keywords, location, salary_min, salary_max, job_type, frequency) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, keywords, location, salary_min || null, salary_max || null, job_type || null, frequency || "Daily"]
    );

    res.status(201).json({
      message: "Job alert created successfully",
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: "Error creating job alert", details: err.message });
  }
};

// ✅ Delete Job Alert
export const deleteJobAlert = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await pool.query("DELETE FROM job_alerts WHERE id=? AND user_id=?", [id, userId]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Job alert not found or not authorized" });

    res.status(200).json({ message: "Job alert deleted successfully", id });
  } catch (err) {
    res.status(500).json({ error: "Error deleting job alert", details: err.message });
  }
};

// ✅ Get all Job Alerts
export const getJobAlerts = async (req, res) => {
  try {
    const [alerts] = await pool.query(
      `SELECT ja.*, u.name AS created_by 
       FROM job_alerts ja 
       JOIN users u ON ja.user_id = u.id`
    );
    res.status(200).json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job alerts", details: err.message });
  }
};

// ✅ Get Job Alert by ID
export const getJobAlertById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT ja.*, u.name AS created_by 
       FROM job_alerts ja 
       JOIN users u ON ja.user_id = u.id
       WHERE ja.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Job alert not found" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job alert", details: err.message });
  }
};

// ✅ Update Job Alert
export const updateJobAlert = async (req, res) => {
  const { id } = req.params;
  const { keywords, location, salary_min, salary_max, job_type, frequency } = req.body;

  try {
    // 1️⃣ Check if job alert exists
    const [existing] = await pool.query("SELECT * FROM job_alerts WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Job alert not found" });
    }

    // 2️⃣ Update the record
    await pool.query(
      `UPDATE job_alerts 
       SET keywords = ?, location = ?, salary_min = ?, salary_max = ?, job_type = ?, frequency = ?, updated_at = NOW()
       WHERE id = ?`,
      [keywords, location, salary_min || null, salary_max || null, job_type || null, frequency || "Daily", id]
    );

    // 3️⃣ Fetch updated record
    const [updated] = await pool.query("SELECT * FROM job_alerts WHERE id = ?", [id]);

    res.status(200).json({
      message: "Job alert updated successfully",
      jobAlert: updated[0],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update job alert", details: err.message });
  }
};
