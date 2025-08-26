import pool from "../config/db.js";

// Get candidate profile (from logged-in user)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // comes from JWT
    const [rows] = await pool.query("SELECT id, name, email, phone, designation, company, location, about FROM users WHERE id = ?", [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile", details: err.message });
  }
};

// Update candidate profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, designation, company, location, about } = req.body;

    await pool.query(
      "UPDATE users SET name=?, email=?, phone=?, designation=?, company=?, location=?, about=? WHERE id=?",
      [name, email, phone, designation, company, location, about, userId]
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};
