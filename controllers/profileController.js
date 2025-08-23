import db from "../config/db.js";

// Get profile (assuming only one profile row exists with id=1)
export const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM profiles WHERE id = 1");
    if (rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile", details: err.message });
  }
};

// Create profile (first time)
export const createProfile = async (req, res) => {
  try {
    const { name, email, phone, designation, company, location, about } = req.body;
    await db.query(
      "INSERT INTO profiles (id, name, email, phone, designation, company, location, about) VALUES (1, ?, ?, ?, ?, ?, ?, ?)",
      [name, email, phone, designation, company, location, about]
    );
    res.status(201).json({ message: "Profile created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create profile", details: err.message });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, designation, company, location, about } = req.body;
    await db.query(
      "UPDATE profiles SET name=?, email=?, phone=?, designation=?, company=?, location=?, about=? WHERE id=1",
      [name, email, phone, designation, company, location, about]
    );
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};
