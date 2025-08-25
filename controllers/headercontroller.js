// controllers/headercontroller.js
import pool from "../config/db.js"; // Make sure your MySQL pool is exported from db.js

// GET /api/header
export const getHeader = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM header LIMIT 1");
    if (!rows.length) return res.status(404).json({ error: "Header not found" });

    const header = rows[0];

    const logo = typeof header.logo === "string" ? JSON.parse(header.logo) : header.logo;
    const navLinks = typeof header.navLinks === "string" ? JSON.parse(header.navLinks) : header.navLinks;
    const actionLinks = typeof header.actionLinks === "string" ? JSON.parse(header.actionLinks) : header.actionLinks;

    res.json({ logo, navLinks, actionLinks });
  } catch (err) {
    res.status(500).json({ error: "Error fetching header", details: err.message });
  }
};

// POST /api/header
export const createHeader = async (req, res) => {
  try {
    const { logo, navLinks, actionLinks } = req.body;
    if (!logo || !navLinks || !actionLinks) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    await pool.query(
      "UPDATE header SET logo = ?, navLinks = ?, actionLinks = ? WHERE id = 1",
      [JSON.stringify(logo), JSON.stringify(navLinks), JSON.stringify(actionLinks)]
    );

    res.json({ message: "Header updated successfully", data: { logo, navLinks, actionLinks } });
  } catch (err) {
    res.status(500).json({ error: "Error updating header", details: err.message });
  }
};
