import pool from "../config/db.js";

// GET /api/job-alerts
// Candidates and employees can see all job alerts
export const getJobAlerts = async (req, res) => {
  try {
    const [alerts] = await pool.query(
      `SELECT ja.*, u.name AS created_by 
       FROM job_alerts ja 
       JOIN users u ON ja.user_id = u.id`
    );
    res.status(200).json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Error fetching job alerts", details: err.message });
  }
};

// GET /api/job-alerts/:id
export const getJobAlertById = async (req, res) => {
  const { id } = req.params;
  try {
    const [alerts] = await pool.query("SELECT * FROM job_alerts WHERE id = ?", [id]);
    if (alerts.length === 0) return res.status(404).json({ error: "Job alert not found" });
    res.status(200).json(alerts[0]);
  } catch (err) {
    res.status(500).json({ error: "Error fetching job alert", details: err.message });
  }
};

// POST /api/job-alerts
// Only employees can create
export const createJobAlert = async (req, res) => {
  const { keywords, location, salaryMin, salaryMax, jobType, frequency } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== "employee") return res.status(403).json({ error: "Forbidden: Only employees can create alerts" });

  try {
    const [result] = await pool.query(
      `INSERT INTO job_alerts 
       (user_id, keywords, location, salary_min, salary_max, job_type, frequency) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, keywords, location, salaryMin || null, salaryMax || null, jobType || null, frequency || "Daily"]
    );
    res.status(201).json({ id: result.insertId, user_id: userId, keywords, location, salaryMin, salaryMax, jobType, frequency });
  } catch (err) {
    res.status(500).json({ error: "Error creating job alert", details: err.message });
  }
};

// PUT /api/job-alerts/:id
// Only employee who created the alert can update
export const updateJobAlert = async (req, res) => {
  const { id } = req.params;
  const { keywords, location, salaryMin, salaryMax, jobType, frequency } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== "employee") return res.status(403).json({ error: "Forbidden: Only employees can update alerts" });

  try {
    const [result] = await pool.query(
      `UPDATE job_alerts 
       SET keywords=?, location=?, salary_min=?, salary_max=?, job_type=?, frequency=? 
       WHERE id=? AND user_id=?`,
      [keywords, location, salaryMin || null, salaryMax || null, jobType || null, frequency || "Daily", id, userId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Job alert not found or you are not authorized" });

    res.status(200).json({ message: "Job alert updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error updating job alert", details: err.message });
  }
};

// DELETE /api/job-alerts/:id
// Only employee who created the alert can delete
export const deleteJobAlert = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== "employee") return res.status(403).json({ error: "Forbidden: Only employees can delete alerts" });

  try {
    const [result] = await pool.query("DELETE FROM job_alerts WHERE id=? AND user_id=?", [id, userId]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Job alert not found or you are not authorized" });

    res.status(200).json({ message: "Job alert deleted successfully", id });
  } catch (err) {
    res.status(500).json({ error: "Error deleting job alert", details: err.message });
  }
};
