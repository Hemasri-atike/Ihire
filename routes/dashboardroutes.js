import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Candidate Dashboard
router.get("/candidate", async (req, res) => {
  try {
    const [jobs] = await pool.query("SELECT * FROM jobs LIMIT 5");

    res.json({
      profile: { name: "Candidate User", appliedCount: 3, shortlistedCount: 1 },
      profileCompletion: 70,
      notifications: [
        { id: 1, type: "invitation", message: "You got an interview invite!" },
      ],
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary,
        status: "Applied",
        tags: ["Full Time"], // add default
        time: "2d ago", // mock value
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Employer Dashboard
router.get("/employer", async (req, res) => {
  try {
    const [jobs] = await pool.query("SELECT * FROM jobs LIMIT 5");

    res.json({
      stats: { totalApplications: 12 },
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary,
        applications: 5,
        tags: ["Open"],
        time: "1w ago",
      })),
      notifications: [
        { id: 2, type: "application", message: "New candidate applied!" },
      ],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
