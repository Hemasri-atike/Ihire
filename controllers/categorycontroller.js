import pool from "../config/db.js";

export const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id AS category_id,
        c.name,
        c.icon,
        COUNT(j.id) AS openPositions
      FROM categories c
      LEFT JOIN jobs j 
        ON c.id = j.category_id AND j.status = 'open'
      GROUP BY c.id, c.name, c.icon
      ORDER BY c.id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
