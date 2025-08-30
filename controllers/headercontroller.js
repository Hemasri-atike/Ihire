// controllers/headercontroller.js
import pool from "../config/db.js";

export const getHeader = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM header LIMIT 1");
    if (!rows.length) return res.status(404).json({ error: "Header not found" });

    const header = rows[0];

    const safeParse = (value) => {
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    };

    res.json({
      logo: safeParse(header.logo),
      navLinks: safeParse(header.navLinks),
      actionLinks: safeParse(header.actionLinks),
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching header", details: err.message });
  }
};

export const createHeader = async (req, res) => {
  try {
    const { logo, navLinks, actionLinks } = req.body;
    if (!logo || !navLinks || !actionLinks) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // ✅ Insert or update safely
    await pool.query(
      "INSERT INTO header (id, logo, navLinks, actionLinks) VALUES (1, ?, ?, ?) " +
      "ON DUPLICATE KEY UPDATE logo = VALUES(logo), navLinks = VALUES(navLinks), actionLinks = VALUES(actionLinks)",
      [JSON.stringify(logo), JSON.stringify(navLinks), JSON.stringify(actionLinks)]
    );

    res.json({ message: "Header updated successfully", data: { logo, navLinks, actionLinks } });
  } catch (err) {
    res.status(500).json({ error: "Error updating header", details: err.message });
  }
};
