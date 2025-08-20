import db from "../config/db.js";

// Get all applicants
const getApplicants = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM applicants");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error fetching applicants", details: err.message });
  }
};

// Create new applicant
const createApplicant = async (req, res) => {
  const { name, email, mobile, position, resume, status, notes } = req.body;

  try {
    const [result] = await db.query(
      "INSERT INTO applicants (name, email, mobile, position, resume, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, mobile, position, resume, status || "Applied", JSON.stringify(notes) || null]
    );
    res.json({ message: "Applicant created successfully", applicantId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Error creating applicant", details: err.message });
  }
};

export default { getApplicants, createApplicant };
