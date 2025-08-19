import db from "../config/db.js"; // your MySQL connection

// Get all jobs
const getJobs = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM jobs");
    res.json({ jobs: rows });
  } catch (err) {
    res.status(500).json({ error: "Error fetching jobs" });
  }
};

// Create a new job
const createJob = async (req, res) => {
  try {
    const { title, description, location, salary } = req.body;
    const userId = req.user.id; // comes from token

    const [result] = await db.query(
      "INSERT INTO jobs (title, description, location, salary, user_id) VALUES (?, ?, ?, ?, ?)",
      [title, description, location, salary, userId]
    );

    res.status(201).json({ message: "Job created", jobId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Error creating job" });
  }
};

// Update job
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, salary } = req.body;
    const userId = req.user.id;

    // Check if job belongs to the user
    const [job] = await db.query("SELECT * FROM jobs WHERE id = ? AND user_id = ?", [id, userId]);
    if (job.length === 0) {
      return res.status(403).json({ error: "Not authorized to update this job" });
    }

    await db.query(
      "UPDATE jobs SET title=?, description=?, location=?, salary=? WHERE id=?",
      [title, description, location, salary, id]
    );

    res.json({ message: "Job updated" });
  } catch (err) {
    res.status(500).json({ error: "Error updating job" });
  }
};

// Delete job
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if job belongs to the user
    const [job] = await db.query("SELECT * FROM jobs WHERE id = ? AND user_id = ?", [id, userId]);
    if (job.length === 0) {
      return res.status(403).json({ error: "Not authorized to delete this job" });
    }

    await db.query("DELETE FROM jobs WHERE id = ?", [id]);
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting job" });
  }
};

export default { getJobs, createJob, updateJob, deleteJob };
