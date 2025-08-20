// controllers/jobcontroller.js
import db from "../config/db.js";

// Get all jobs
const getJobs = async (req, res) => {
  try {
    const [jobs] = await db.query("SELECT * FROM jobs");
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Error fetching jobs", details: err.message });
  }
};

// Create job
const createJob = async (req, res) => {
  const { title, description, location, salary, company_name } = req.body;
  const user_id = req.user.id; // From authenticate middleware

  try {
    const [result] = await db.query(
      "INSERT INTO jobs (title, description, location, salary, company_name, user_id) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, location, salary, company_name, user_id]
    );
    res.json({ message: "Job created successfully", jobId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Error creating job", details: err.message });
  }
};

// Update job
const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, salary, company_name } = req.body;

  try {
    await db.query(
      "UPDATE jobs SET title=?, description=?, location=?, salary=?, company_name=? WHERE id=?",
      [title, description, location, salary, company_name, id]
    );
    res.json({ message: "Job updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error updating job", details: err.message });
  }
};

// Delete job
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
