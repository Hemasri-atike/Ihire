import express from "express";
import db from "../config/db.js"; // mysql connection

const router = express.Router();

router.get("/candidate", async (req, res) => {
  try {
    const [jobs] = await db.query("SELECT * FROM jobs LIMIT 5");
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
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/employer", async (req, res) => {
  try {
    const [jobs] = await db.query("SELECT * FROM jobs LIMIT 5");
    res.json({
      stats: { totalApplications: 12 },
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary,
        applications: 5,
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
