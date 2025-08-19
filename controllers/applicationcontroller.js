

import db from "../config/db.js";

// Create Application
export const createApplication = async (req, res) => {
  // your insert logic
};

// Get Applications
export const getApplications = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM applications ORDER BY id DESC");
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching applications", details: error.message });
  }
};
