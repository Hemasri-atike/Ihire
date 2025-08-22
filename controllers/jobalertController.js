import db from "../config/db.js";

// GET /api/job-alerts
// Candidates and employees can see all job alerts
export const getJobAlerts = async (req, res) => {
  try {
    const [alerts] = await db.query(
      `SELECT ja.*, u.name AS created_by 
       FROM job_alerts ja 
       JOIN users u ON ja.user_id = u.id`
    );
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching job alerts", details: err.message });
  }
};

// GET /api/job-alerts/:id
export const getJobAlertById = async (req, res) => {
  const { id } = req.params;
  try {
    const [alerts] = await db.query("SELECT * FROM job_alerts WHERE id=?", [id]);
    if (alerts.length === 0) return res.status(404).json({ message: "Job alert not found" });
    res.json(alerts[0]);
  } catch (err) {
    res.status(500).json({ message: "Error fetching job alert", details: err.message });
  }
};

// POST /api/job-alerts
// Only employee can create
export const createJobAlert = async (req, res) => {
  const { keywords, location, salaryMin, salaryMax, jobType, frequency } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== "employee") return res.status(403).json({ message: "Forbidden" });

  try {
    const [result] = await db.query(
      `INSERT INTO job_alerts 
       (user_id, keywords, location, salary_min, salary_max, job_type, frequency) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, keywords, location, salaryMin, salaryMax, jobType, frequency]
    );
    res.status(201).json({ id: result.insertId, user_id: userId, ...req.body });
  } catch (err) {
    res.status(500).json({ message: "Error creating job alert", details: err.message });
  }
};

// PUT /api/job-alerts/:id
// Only employee who created can update
export const updateJobAlert = async (req, res) => {
  const { id } = req.params;
  const { keywords, location, salaryMin, salaryMax, jobType, frequency } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== "employee") return res.status(403).json({ message: "Forbidden" });

  try {
    const [result] = await db.query(
      `UPDATE job_alerts 
       SET keywords=?, location=?, salary_min=?, salary_max=?, job_type=?, frequency=? 
       WHERE id=? AND user_id=?`,
      [keywords, location, salaryMin, salaryMax, jobType, frequency, id, userId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Job alert not found or not authorized" });
    res.json({ message: "Job alert updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating job alert", details: err.message });
  }
};

// DELETE /api/job-alerts/:id
// Only employee who created can delete
export const deleteJobAlert = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  if (role !== "employee") return res.status(403).json({ message: "Forbidden" });

  try {
    const [result] = await db.query("DELETE FROM job_alerts WHERE id=? AND user_id=?", [id, userId]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Job alert not found or not authorized" });
    res.json({ message: "Job alert deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting job alert", details: err.message });
  }
};
