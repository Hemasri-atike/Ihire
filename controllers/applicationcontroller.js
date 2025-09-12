import pool from "../config/db.js";

// Create application
export const createApplication = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      experience,
      jobTitle,
      company,
      qualification,
      specialization,
      university,
      skills,
      coverLetter,
      linkedIn,
      portfolio,
    } = req.body;

    const resume = req.file ? req.file.filename : null;

    // Check if application already exists
    const [existing] = await pool.execute(
      "SELECT * FROM applications WHERE email = ? AND jobTitle = ?",
      [email, jobTitle]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Application already exists for this job" });
    }

    const query = `
      INSERT INTO applications 
      (fullName, email, phone, location, experience, jobTitle, company, qualification, specialization, university, skills, resume, coverLetter, linkedIn, portfolio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      fullName || null,
      email || null,
      phone || null,
      location || null,
      experience || null,
      jobTitle || null,
      company || null,
      qualification || null,
      specialization || null,
      university || null,
      skills || null,
      resume || null,
      coverLetter || null,
      linkedIn || null,
      portfolio || null,
    ]);

    res
      .status(201)
      .json({ message: "Application submitted successfully", id: result.insertId });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error creating application", details: error.message });
  }
};

// Get all applications
export const getApplications = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM applications ORDER BY id DESC"
    );
    res.status(200).json(rows);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching applications", details: error.message });
  }
};
