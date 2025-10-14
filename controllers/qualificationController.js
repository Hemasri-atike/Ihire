import pool from "../config/db.js";

export const getQualifications = async (req, res) => {
  try {
    const sql = 'SELECT * FROM qualifications ORDER BY category, subcategory';
    const [rows] = await pool.query(sql);
console.log("Qualifications fetched:", rows.length);  
    res.json(rows);
  } catch (error) {
    console.error("getQualifications error:", error.message);
    res.status(500).json({ error: "Failed to fetch qualifications", details: error.message });
  }
};